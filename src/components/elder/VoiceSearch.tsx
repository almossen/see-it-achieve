import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Mic, MicOff, X, Check, RefreshCw } from "lucide-react";
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

// ─── Google Custom Search (via Edge Function) ───────────────────
async function fetchGoogleImages(query: string): Promise<{ images: string[]; titles: string[] }> {
  try {
    const { data, error } = await supabase.functions.invoke("search-images", {
      body: { query, count: 6 },
    });
    if (error) {
      console.error("Search images error:", error);
      return { images: [], titles: [] };
    }
    return {
      images: data?.images || [],
      titles: data?.titles || [],
    };
  } catch {
    return { images: [], titles: [] };
  }
}

// ─── نوع المنتج المعلّق ──────────────────────────────────────────
interface PendingProduct {
  productQuery: string;
  detectedUnit: string | null;
  detectedQuantity: number;
  dbProduct: any | null;
  images: string[];
  titles: string[];
  selectedImage: string | null;
  selectedTitle: string | null;
  quantity: number;
  selectedUnit: string;
  // مرحلة العرض: "image" = اختيار الصورة، "unit" = اختيار الوحدة، "quantity" = تأكيد الكمية
  stage: "image" | "unit" | "quantity";
}

const VOICE_QUICK_QUANTITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ALL_UNITS_MAP: Record<string, { emoji: string; label: string }> = {
  "حبة": { emoji: "1️⃣", label: "حبة" },
  "كرتون": { emoji: "📦", label: "كرتون" },
  "صحن": { emoji: "🍽️", label: "صحن" },
  "كيلو": { emoji: "⚖️", label: "كيلو" },
  "كيس": { emoji: "🛍️", label: "كيس" },
  "حزمة": { emoji: "🌿", label: "حزمة" },
  "درزن": { emoji: "🥚", label: "درزن" },
  "علبة": { emoji: "🥫", label: "علبة" },
  "ربطة": { emoji: "🧻", label: "ربطة" },
};

// ─── المكوّن الرئيسي ─────────────────────────────────────────────
const VoiceSearch = ({ onClose }: VoiceSearchProps) => {
  const { tenantId, user } = useAuth();
  const { addItem, updateQuantity } = useCart();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [knownUnits, setKnownUnits] = useState<string[]>(BASE_UNITS);
  const [synonymsMap, setSynonymsMap] = useState<Record<string, string>>({});

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
      if (pendingProduct) return;

      const segments = splitIntoItems(fullQuery);
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
        // مطابقة تامة
        if (stored === normalizedQuery) return 4;
        // الاستعلام الكامل موجود في اسم المنتج أو العكس
        if (stored.includes(normalizedQuery) || normalizedQuery.includes(stored)) return 3;
        // كل كلمات الاستعلام موجودة في اسم المنتج (مطابقة قوية)
        if (words.length >= 2 && words.every(w => stored.includes(w))) return 2;
        // كلمة واحدة فقط تطابق — نقبل فقط إذا كانت الجملة كلمة واحدة
        if (words.length === 1 && words.some(w => stored.includes(w))) return 1;
        return 0;
      };

      // نقبل المنتج فقط إذا كان rank >= 2 (مطابقة قوية)
      // rank=1 يعني كلمة واحدة فقط تطابقت من جملة متعددة الكلمات → نتجاهله
      const minAcceptableRank = words.length >= 2 ? 2 : 1;

      const dbProduct = data
        ?.map(p => ({ p, rank: rankMatch(p) }))
        .filter(x => x.rank >= minAcceptableRank)
        .sort((a, b) => b.rank - a.rank)[0]?.p || null;

      // إذا المنتج موجود في DB وعنده صورة → لا نبحث في DuckDuckGo
      const hasDbImage = !!(dbProduct?.image_url);

      if (hasDbImage) {
        // المنتج عنده صورة → نذهب مباشرة لمرحلة اختيار الوحدة
        setPendingProduct({
          productQuery,
          detectedUnit,
          detectedQuantity,
          dbProduct,
          images: [],
          titles: [],
          selectedImage: dbProduct.image_url,
          selectedTitle: null,
          quantity: detectedQuantity,
          selectedUnit: detectedUnit || dbProduct?.unit || "حبة",
          stage: "unit",
        });
      } else {
        // المنتج بدون صورة أو غير موجود في DB → نبحث في DuckDuckGo بالجملة الكاملة
        setLoadingImages(true);
        const { images, titles } = await fetchGoogleImages(resolvedQuery);
        setLoadingImages(false);

        setPendingProduct({
          productQuery,
          detectedUnit,
          detectedQuantity,
          dbProduct,
          images,
          titles,
          selectedImage: images[0] || null,
          selectedTitle: titles[0] || null,
          quantity: detectedQuantity,
          selectedUnit: detectedUnit || dbProduct?.unit || "حبة",
          stage: images.length > 0 ? "image" : "unit",
        });
      }
    };
  }, [tenantId, user, knownUnits, synonymsMap, pendingProduct]);

  // الانتقال من مرحلة الصورة إلى مرحلة الكمية
  const proceedToQuantity = () => {
    if (!pendingProduct) return;
    const img = pendingProduct.selectedImage || pendingProduct.images[0] || null;
    setPendingProduct(prev => prev ? { ...prev, selectedImage: img, stage: "unit" } : prev);
  };

  // تأكيد الإضافة للسلة
  const confirmAddToCart = () => {
    if (!pendingProduct) return;
    const { productQuery, dbProduct, selectedImage, quantity, selectedUnit } = pendingProduct;
    const unitLabel = selectedUnit || "حبة";

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
        unit: selectedUnit,
        suggested_by: user?.id,
      });
    }

    toast.success(`✅ تمت إضافة ${quantity} ${unitLabel} ${productQuery} للسلة`);
    setPendingProduct(null);
  };

  const cancelPending = () => setPendingProduct(null);

  // إعادة البحث عن صور جديدة
  const refetchImages = async () => {
    if (!pendingProduct) return;
    setLoadingImages(true);
    const { images, titles } = await fetchGoogleImages(pendingProduct.productQuery);
    setLoadingImages(false);
    setPendingProduct(prev =>
      prev ? { ...prev, images, titles, selectedImage: images[0] || null, selectedTitle: titles[0] || null } : prev
    );
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
    if (pendingProduct) return;
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

        {/* ── مرحلة اختيار الصورة ── */}
        <AnimatePresence mode="wait">
          {pendingProduct && pendingProduct.stage === "image" && (
            <motion.div
              key="image-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="p-4 space-y-4"
            >
              {/* العنوان */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">سمعتك تقول</p>
                <h3 className="text-2xl font-bold text-primary">
                  "{pendingProduct.productQuery}"
                </h3>
                <p className="text-sm text-muted-foreground mt-1">اختر الصورة الصحيحة للمنتج</p>
              </div>

              {/* شبكة الصور */}
              {loadingImages ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">جاري البحث في Google...</p>
                </div>
              ) : pendingProduct.images.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground">لم يتم العثور على صور</p>
                  <button
                    onClick={refetchImages}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                  >
                    <RefreshCw className="h-4 w-4" />
                    إعادة البحث
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {pendingProduct.images.map((img, i) => {
                    const isSelected = pendingProduct.selectedImage === img;
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setPendingProduct(prev =>
                            prev ? { ...prev, selectedImage: img, selectedTitle: prev.titles[i] || null } : prev
                          )
                        }
                        className={`relative rounded-2xl overflow-hidden border-4 transition-all ${
                          isSelected
                            ? "border-primary scale-[1.03] shadow-xl"
                            : "border-transparent hover:border-primary/30"
                        }`}
                      >
                        <img
                          src={img}
                          alt={pendingProduct.titles[i] || `خيار ${i + 1}`}
                          className="w-full aspect-square object-cover bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=📦";
                          }}
                        />
                        {/* شارة الاختيار */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                        {/* اسم البراند من Google */}
                        {pendingProduct.titles[i] && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate text-right">
                            {pendingProduct.titles[i]}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* أزرار التنقل */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={cancelPending}
                  className="flex-1 py-4 rounded-2xl border border-border text-base font-bold hover:bg-muted transition-colors"
                >
                  ❌ إلغاء
                </button>
                <button
                  onClick={proceedToQuantity}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-colors"
                >
                  التالي — الكمية ←
                </button>
              </div>
            </motion.div>
          )}

          {/* ── مرحلة اختيار الوحدة (صوتي) ── */}
          {pendingProduct && pendingProduct.stage === "unit" && (
            <motion.div
              key="unit-stage"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              className="p-4 space-y-5"
            >
              {/* معاينة المنتج */}
              <div className="flex flex-col items-center gap-3 py-2">
                {pendingProduct.selectedImage ? (
                  <img
                    src={pendingProduct.selectedImage}
                    alt={pendingProduct.productQuery}
                    className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-primary/20"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=📦";
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center text-5xl">
                    {pendingProduct.dbProduct?.emoji || "📦"}
                  </div>
                )}
                <h3 className="text-xl font-bold">{pendingProduct.productQuery}</h3>
                <p className="text-lg text-muted-foreground">اختر الوحدة</p>
              </div>

              {/* أزرار الوحدات */}
              {(() => {
                const unitsList = (pendingProduct.dbProduct?.category_id ? [] : ["حبة", "كرتون", "كيلو"]);
                // Try to get category unit_options if available
                const defaultUnits = unitsList.length > 0 ? unitsList : ["حبة", "كرتون", "كيلو"];
                const displayUnits = defaultUnits.map(u => ({
                  value: u,
                  ...(ALL_UNITS_MAP[u] || { emoji: "📦", label: u })
                }));
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {displayUnits.map((u) => (
                      <motion.button
                        key={u.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setPendingProduct(prev => prev ? {
                            ...prev,
                            selectedUnit: u.value,
                            quantity: 1,
                            stage: "quantity"
                          } : prev);
                        }}
                        className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-transparent bg-muted/50 hover:border-primary hover:bg-primary/10 min-h-[100px] transition-all"
                      >
                        <span className="text-[40px]">{u.emoji}</span>
                        <span className="text-xl font-bold">{u.label}</span>
                      </motion.button>
                    ))}
                  </div>
                );
              })()}

              {/* زر إلغاء */}
              <button
                onClick={cancelPending}
                className="w-full py-4 rounded-2xl border border-border text-base font-bold hover:bg-muted transition-colors"
              >
                ❌ إلغاء
              </button>
            </motion.div>
          )}

          {/* ── مرحلة تأكيد الكمية (صوتي) ── */}
          {pendingProduct && pendingProduct.stage === "quantity" && (
            <motion.div
              key="quantity-stage"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              className="p-4 space-y-5"
            >
              {/* معاينة المنتج المختار */}
              <div className="flex flex-col items-center gap-2 py-2">
                {pendingProduct.selectedImage ? (
                  <img
                    src={pendingProduct.selectedImage}
                    alt={pendingProduct.productQuery}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-primary/20"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=📦";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-4xl">
                    {pendingProduct.dbProduct?.emoji || "📦"}
                  </div>
                )}
                <h3 className="text-xl font-bold">{pendingProduct.productQuery}</h3>
                <p className="text-lg text-muted-foreground">
                  كم {ALL_UNITS_MAP[pendingProduct.selectedUnit]?.label || pendingProduct.selectedUnit}؟
                </p>

                {/* زر تغيير الوحدة */}
                <button
                  onClick={() => setPendingProduct(prev => prev ? { ...prev, stage: "unit" } : prev)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  تغيير الوحدة ({ALL_UNITS_MAP[pendingProduct.selectedUnit]?.emoji} {ALL_UNITS_MAP[pendingProduct.selectedUnit]?.label || pendingProduct.selectedUnit})
                </button>
              </div>

              {/* شبكة أرقام */}
              <div className="grid grid-cols-5 gap-3">
                {VOICE_QUICK_QUANTITIES.map((q) => (
                  <motion.button
                    key={q}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setPendingProduct(prev => prev ? { ...prev, quantity: q } : prev)
                    }
                    className={`aspect-square rounded-2xl flex items-center justify-center text-3xl font-bold transition-all border-3 ${
                      pendingProduct.quantity === q
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                        : "bg-muted/50 border-transparent hover:border-primary/50"
                    }`}
                  >
                    {q}
                  </motion.button>
                ))}
              </div>

              {/* ملخص */}
              <div className="text-center py-1">
                <span className="text-2xl font-bold text-primary">
                  {pendingProduct.quantity} {ALL_UNITS_MAP[pendingProduct.selectedUnit]?.label || pendingProduct.selectedUnit} {ALL_UNITS_MAP[pendingProduct.selectedUnit]?.emoji || "📦"}
                </span>
              </div>

              {/* أزرار التأكيد */}
              <div className="flex gap-3">
                <button
                  onClick={cancelPending}
                  className="flex-1 py-4 rounded-2xl border border-border text-base font-bold hover:bg-muted transition-colors"
                >
                  ❌ إلغاء
                </button>
                <button
                  onClick={confirmAddToCart}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-colors shadow-md"
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
                ? "⏳ جاري البحث في Google..."
                : isListening
                ? "جاري الاستماع... تكلّم الآن"
                : "اضغط وقل اسم المنتج"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              مثال: "حليب المراعي" أو "كيلو طماطم"
            </p>

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
