import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Mic, MicOff, X, Plus, Minus, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceSearchProps {
  onClose: () => void;
}

// ─── أرقام عربية ───────────────────────────────────────────────
const ARABIC_NUMBERS: Record<string, number> = {
  واحد: 1, واحدة: 1,
  اثنين: 2, اثنان: 2, اثنتين: 2,
  ثلاثة: 3, ثلاث: 3,
  أربعة: 4, أربع: 4,
  خمسة: 5, خمس: 5,
  ستة: 6, ست: 6,
  سبعة: 7, سبع: 7,
  ثمانية: 8, ثماني: 8, ثمان: 8,
  تسعة: 9, تسع: 9,
  عشرة: 10, عشر: 10,
};

function toDual(unit: string): string {
  if (unit.endsWith("ة")) return unit.slice(0, -1) + "تين";
  return unit + "ين";
}

function parseVoiceQuery(
  raw: string,
  knownUnits: string[]
): { productQuery: string; detectedUnit: string | null; detectedQuantity: number } {
  let text = raw.trim();
  let detectedUnit: string | null = null;
  let detectedQuantity = 1;

  const unitMap: Record<string, string> = {};
  for (const unit of knownUnits) {
    unitMap[toDual(unit)] = unit;
  }

  for (const [word, num] of Object.entries(ARABIC_NUMBERS)) {
    if (text.startsWith(word + " ")) {
      detectedQuantity = num;
      text = text.slice(word.length + 1).trim();
      break;
    }
  }

  const digitMatch = text.match(/^(\d+)\s+/);
  if (digitMatch && detectedQuantity === 1) {
    detectedQuantity = parseInt(digitMatch[1], 10);
    text = text.slice(digitMatch[0].length).trim();
  }

  for (const [dual, singular] of Object.entries(unitMap)) {
    if (text.startsWith(dual + " ") || text === dual) {
      detectedUnit = singular;
      if (detectedQuantity === 1) detectedQuantity = 2;
      text = text.startsWith(dual + " ") ? text.slice(dual.length + 1).trim() : "";
      break;
    }
    if (text.endsWith(" " + dual)) {
      detectedUnit = singular;
      if (detectedQuantity === 1) detectedQuantity = 2;
      text = text.slice(0, text.length - dual.length - 1).trim();
      break;
    }
  }

  if (!detectedUnit) {
    for (const unit of knownUnits) {
      if (text.startsWith(unit + " ") || text === unit) {
        detectedUnit = unit;
        text = text.startsWith(unit + " ") ? text.slice(unit.length + 1).trim() : "";
        break;
      }
      if (text.endsWith(" " + unit)) {
        detectedUnit = unit;
        text = text.slice(0, text.length - unit.length - 1).trim();
        break;
      }
    }
  }

  return { productQuery: text, detectedUnit, detectedQuantity };
}

function splitIntoItems(raw: string): string[] {
  const normalized = raw
    .replace(/\s+وكمان\s*/g, "|")
    .replace(/\s+وأيضا?\s*/g, "|")
    .replace(/\s+و\s+/g, "|")
    .replace(/\s+و(?=[ا-ي\d])/g, "|")
    .replace(/[،,]\s*/g, "|");
  return normalized.split("|").map(s => s.trim()).filter(Boolean);
}

const BASE_UNITS = ["كرتون", "كيلو", "حبة", "حزمة", "علبة", "كيس", "لتر", "باكيت", "صندوق", "ربطة", "طبق", "قطعة"];

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ|ؤ/g, "ء")
    .trim();
}

// ─── Unsplash ───────────────────────────────────────────────────
// ضع مفتاح Unsplash هنا أو في متغيرات البيئة
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";

async function fetchUnsplashImages(query: string): Promise<string[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    // fallback: صور placeholder لو ما في مفتاح
    return [
      `https://source.unsplash.com/200x200/?${encodeURIComponent(query)},food,1`,
      `https://source.unsplash.com/200x200/?${encodeURIComponent(query)},food,2`,
      `https://source.unsplash.com/200x200/?${encodeURIComponent(query)},grocery,3`,
      `https://source.unsplash.com/200x200/?${encodeURIComponent(query)},market,4`,
    ];
  }
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );
    const data = await res.json();
    return (data.results || []).map((r: any) => r.urls?.small || r.urls?.regular);
  } catch {
    return [];
  }
}

// ─── نوع المنتج المعلّق ──────────────────────────────────────────
interface PendingProduct {
  productQuery: string;
  detectedUnit: string | null;
  detectedQuantity: number;
  dbProduct: any | null; // المنتج من DB إن وُجد
  images: string[];
  selectedImage: string | null;
  quantity: number;
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────────
const VoiceSearch = ({ onClose }: VoiceSearchProps) => {
  const { tenantId, user } = useAuth();
  const { addItem, updateQuantity } = useCart();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [knownUnits, setKnownUnits] = useState<string[]>(BASE_UNITS);
  const [synonymsMap, setSynonymsMap] = useState<Record<string, string>>({});

  // المنتج الحالي المنتظر تأكيد الصورة
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  const recognitionRef = useRef<any>(null);

  // تحميل الوحدات
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("categories")
      .select("unit_options")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (!data) return;
        const allUnits = new Set<string>(BASE_UNITS);
        for (const cat of data) {
          for (const u of (cat.unit_options || [])) {
            if (u) allUnits.add(u.trim());
          }
        }
        setKnownUnits([...allUnits]);
      });
  }, [tenantId]);

  // تحميل المرادفات
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("voice_synonyms")
      .select("from_word, to_word")
      .eq("tenant_id", tenantId)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        for (const s of data) map[s.from_word] = s.to_word;
        setSynonymsMap(map);
      });
  }, [tenantId]);

  const applySynonyms = (text: string): string => {
    if (synonymsMap[text]) return synonymsMap[text];
    return text.split(/\s+/).map(w => synonymsMap[w] ?? w).join(" ");
  };

  // البحث في DB + جلب الصور
  const handleVoiceResultRef = useRef<(query: string) => Promise<void>>();

  useEffect(() => {
    handleVoiceResultRef.current = async (fullQuery: string) => {
      if (!tenantId || !fullQuery.trim()) return;

      // لو فيه منتج معلّق، نتجاهل حتى يتم تأكيده
      if (pendingProduct) return;

      const segments = splitIntoItems(fullQuery);
      // نأخذ أول segment فقط — الباقي بعد التأكيد
      const segment = segments[0];
      if (!segment) return;

      const { productQuery, detectedUnit, detectedQuantity } = parseVoiceQuery(segment, knownUnits);
      if (!productQuery) return;

      const resolvedQuery = applySynonyms(productQuery);
      const normalizedQuery = normalizeArabic(resolvedQuery);
      const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);

      const orParts = [
        `name_ar.ilike.%${productQuery}%`,
        `name_en.ilike.%${productQuery}%`,
        `name_ar.ilike.%${resolvedQuery}%`,
        `name_en.ilike.%${resolvedQuery}%`,
        ...words.map(w => `name_ar.ilike.%${w}%`),
        ...words.map(w => `name_en.ilike.%${w}%`),
      ];

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or(orParts.join(","))
        .limit(10);

      const rankMatch = (p: { name_ar: string; name_en: string | null }) => {
        const stored = normalizeArabic(p.name_ar);
        if (stored === normalizedQuery) return 4;
        if (stored.includes(normalizedQuery) || normalizedQuery.includes(stored)) return 3;
        if (words.every(w => stored.includes(w))) return 2;
        if (words.some(w => stored.includes(w))) return 1;
        return 0;
      };

      const dbProduct = data
        ?.map(p => ({ p, rank: rankMatch(p) }))
        .filter(x => x.rank > 0)
        .sort((a, b) => b.rank - a.rank)[0]?.p || null;

      // جلب الصور من Unsplash
      setLoadingImages(true);
      const images = await fetchUnsplashImages(resolvedQuery + " food");
      setLoadingImages(false);

      setPendingProduct({
        productQuery,
        detectedUnit,
        detectedQuantity,
        dbProduct,
        images,
        selectedImage: dbProduct?.image_url || null,
        quantity: detectedQuantity,
      });
    };
  }, [tenantId, user, knownUnits, synonymsMap, pendingProduct]);

  // تأكيد الإضافة للسلة
  const confirmAddToCart = () => {
    if (!pendingProduct) return;
    const { productQuery, detectedUnit, dbProduct, selectedImage, quantity } = pendingProduct;

    const unitLabel = detectedUnit || dbProduct?.unit || "حبة";

    if (dbProduct) {
      addItem({
        product_id: dbProduct.id,
        name: dbProduct.name_ar,
        emoji: dbProduct.emoji,
        price: dbProduct.price,
        unit: unitLabel,
        image_url: selectedImage || dbProduct.image_url,
      });
      if (quantity > 1) updateQuantity(dbProduct.id, quantity);
      setAddedItems(prev => [...prev, `✅ ${quantity} ${unitLabel} ${dbProduct.name_ar}`]);
    } else {
      const customId = `custom_${Date.now()}`;
      addItem({
        product_id: customId,
        name: productQuery,
        emoji: "📝",
        unit: unitLabel,
        is_custom: true,
        image_url: selectedImage || undefined,
      });
      if (quantity > 1) updateQuantity(customId, quantity);
      setAddedItems(prev => [...prev, `📝 ${quantity} ${unitLabel} ${productQuery}`]);

      supabase.from("suggested_products").insert({
        tenant_id: tenantId,
        name_ar: productQuery,
        unit: detectedUnit,
        suggested_by: user?.id,
      });
    }

    toast.success(`تمت إضافة ${productQuery} للسلة`);
    setPendingProduct(null);
  };

  // إلغاء المنتج المعلّق
  const cancelPending = () => {
    setPendingProduct(null);
  };

  // إعداد Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("المتصفح لا يدعم التعرف على الصوت");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
      if (event.results[event.results.length - 1].isFinal) {
        handleVoiceResultRef.current?.(finalTranscript);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") toast.error("يرجى السماح باستخدام الميكروفون");
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, []);

  const toggleListening = () => {
    if (pendingProduct) return; // لا تشغّل الميكروفون لو في تأكيد معلّق
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold">🎤 أطلب بصوتك</h2>
        <button onClick={onClose} className="p-2">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── حالة تأكيد الصورة ── */}
        <AnimatePresence>
          {pendingProduct && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="p-4 space-y-4"
            >
              <h3 className="text-lg font-bold text-center">
                هل تقصد "{pendingProduct.productQuery}"؟
              </h3>

              {/* صور للاختيار */}
              {loadingImages ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {pendingProduct.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setPendingProduct(prev =>
                          prev ? { ...prev, selectedImage: img } : prev
                        )
                      }
                      className={`relative rounded-2xl overflow-hidden border-4 transition-all ${
                        pendingProduct.selectedImage === img
                          ? "border-primary scale-105 shadow-xl"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`خيار ${i + 1}`}
                        className="w-full aspect-square object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=📦";
                        }}
                      />
                      {pendingProduct.selectedImage === img && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* الكمية */}
              <div className="flex items-center justify-center gap-6 py-2">
                <button
                  onClick={() =>
                    setPendingProduct(prev =>
                      prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : prev
                    )
                  }
                  className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl font-bold hover:bg-muted/80"
                >
                  <Minus className="h-6 w-6" />
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold">{pendingProduct.quantity}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingProduct.detectedUnit || pendingProduct.dbProduct?.unit || "حبة"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPendingProduct(prev =>
                      prev ? { ...prev, quantity: prev.quantity + 1 } : prev
                    )
                  }
                  className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* أزرار التأكيد / الإلغاء */}
              <div className="flex gap-3">
                <button
                  onClick={cancelPending}
                  className="flex-1 py-4 rounded-2xl border border-border text-lg font-bold hover:bg-muted"
                >
                  ❌ إلغاء
                </button>
                <button
                  onClick={confirmAddToCart}
                  className="flex-2 flex-grow py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90"
                >
                  ✅ أضف للسلة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── حالة الاستماع (تظهر لو ما في pending) ── */}
        {!pendingProduct && (
          <div className="flex flex-col items-center justify-center px-4 py-10">
            <button
              onClick={toggleListening}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-destructive text-destructive-foreground scale-110 shadow-2xl"
                  : "bg-primary text-primary-foreground shadow-lg"
              }`}
            >
              {isListening ? (
                <MicOff className="h-14 w-14" />
              ) : (
                <Mic className="h-14 w-14" />
              )}
            </button>
            <p className="text-lg mt-6 text-center font-medium">
              {loadingImages
                ? "⏳ جاري البحث عن الصور..."
                : isListening
                ? "جاري الاستماع... تكلّم الآن"
                : "اضغط وقل اسم المنتج"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">مثال: "كرتون خيار" أو "كيلو طماطم"</p>

            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-muted rounded-xl p-4 w-full max-w-sm text-center"
              >
                <p className="text-base">🗣️ {transcript}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* المنتجات المضافة */}
      {addedItems.length > 0 && !pendingProduct && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-card border-t border-border rounded-t-3xl p-4 max-h-[35vh] overflow-y-auto"
        >
          <h3 className="text-lg font-bold mb-3">المنتجات المضافة ({addedItems.length})</h3>
          <div className="space-y-2">
            {addedItems.map((item, i) => (
              <div key={i} className="bg-muted rounded-xl p-3 text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            اضغط على المايك لإضافة منتج آخر
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VoiceSearch;
