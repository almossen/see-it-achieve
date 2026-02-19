import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Mic, MicOff, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VoiceSearchProps {
  onClose: () => void;
}

// Known units with dual forms mapped to singular
const UNIT_MAP: Record<string, string> = {
  كرتونين: "كرتون", كيلوين: "كيلو", حبتين: "حبة", حزمتين: "حزمة",
  علبتين: "علبة", كيسين: "كيس", لترين: "لتر", صندوقين: "صندوق",
  طبقين: "طبق", قطعتين: "قطعة", ربطتين: "ربطة",
};
const KNOWN_UNITS = ["كرتون", "كيلو", "حبة", "حزمة", "علبة", "كيس", "لتر", "باكيت", "صندوق", "ربطة", "طبق", "قطعة"];

// Arabic number words → numeric value
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

function parseVoiceQuery(raw: string): { productQuery: string; detectedUnit: string | null; detectedQuantity: number } {
  let text = raw.trim();
  let detectedUnit: string | null = null;
  let detectedQuantity = 1;

  // 1. Extract leading Arabic number word (e.g. "ثلاث كرتون خيار")
  for (const [word, num] of Object.entries(ARABIC_NUMBERS)) {
    if (text.startsWith(word + " ")) {
      detectedQuantity = num;
      text = text.slice(word.length + 1).trim();
      break;
    }
  }

  // 2. Extract leading numeric digit (e.g. "3 كرتون خيار")
  const digitMatch = text.match(/^(\d+)\s+/);
  if (digitMatch && detectedQuantity === 1) {
    detectedQuantity = parseInt(digitMatch[1], 10);
    text = text.slice(digitMatch[0].length).trim();
  }

  // 3. Detect dual unit forms (كيلوين → qty 2 + كيلو)
  for (const [dual, singular] of Object.entries(UNIT_MAP)) {
    if (text.startsWith(dual + " ")) {
      detectedUnit = singular;
      if (detectedQuantity === 1) detectedQuantity = 2;
      text = text.slice(dual.length + 1).trim();
      break;
    }
    if (text.endsWith(" " + dual)) {
      detectedUnit = singular;
      if (detectedQuantity === 1) detectedQuantity = 2;
      text = text.slice(0, text.length - dual.length - 1).trim();
      break;
    }
  }

  // 4. Detect singular unit if not yet found
  if (!detectedUnit) {
    for (const unit of KNOWN_UNITS) {
      if (text.startsWith(unit + " ")) {
        detectedUnit = unit;
        text = text.slice(unit.length + 1).trim();
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

const VoiceSearch = ({ onClose }: VoiceSearchProps) => {
  const { tenantId, user } = useAuth();
  const { addItem, updateQuantity } = useCart();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  // Keep a ref to the latest handler to avoid stale closure in SpeechRecognition callbacks
  const handleVoiceResultRef = useRef<(query: string) => Promise<void>>();

  useEffect(() => {
    handleVoiceResultRef.current = async (query: string) => {
      if (!tenantId || !query.trim()) return;

      const { productQuery, detectedUnit, detectedQuantity } = parseVoiceQuery(query);

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or(`name_ar.ilike.%${productQuery}%,name_en.ilike.%${productQuery}%`)
        .limit(5);

      if (data && data.length > 0) {
        const product = data[0];
        const unitLabel = detectedUnit || product.unit || "";
        addItem({
          product_id: product.id,
          name: product.name_ar,
          emoji: product.emoji,
          price: product.price,
          unit: unitLabel,
          image_url: product.image_url,
        });
        // Set quantity if more than 1
        if (detectedQuantity > 1) {
          updateQuantity(product.id, detectedQuantity);
        }
        const qtyLabel = detectedQuantity > 1 ? `${detectedQuantity} ` : "";
        setAddedItems(prev => [...prev, `✅ ${qtyLabel}${unitLabel} ${product.name_ar}`]);
        toast.success(`تمت إضافة ${detectedQuantity > 1 ? detectedQuantity + " " : ""}${product.name_ar} للسلة`);
      } else {
        const customId = `custom_${Date.now()}`;
        const unitLabel = detectedUnit || "حبة";
        addItem({
          product_id: customId,
          name: productQuery,
          emoji: "📝",
          unit: unitLabel,
          is_custom: true,
        });
        if (detectedQuantity > 1) {
          updateQuantity(customId, detectedQuantity);
        }
        const qtyLabel = detectedQuantity > 1 ? `${detectedQuantity} ` : "";
        setAddedItems(prev => [...prev, `📝 ${qtyLabel}${unitLabel} ${productQuery} — غير موجود بالقائمة`]);
        toast.info(`تمت إضافة "${productQuery}" كمنتج مخصص`);

        await supabase.from("suggested_products").insert({
          tenant_id: tenantId,
          name_ar: productQuery,
          unit: detectedUnit,
          suggested_by: user?.id,
        });
      }
    };
  }, [tenantId, user, addItem, updateQuantity]);

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

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("يرجى السماح باستخدام الميكروفون");
      }
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

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

      {/* Mic area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
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
          {isListening ? "جاري الاستماع... تكلّم الآن" : "اضغط وقل اسم المنتج"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">مثال: "كرتون خيار" أو "كيلو طماطم"</p>

        {/* Transcript */}
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

      {/* Added items list */}
      {addedItems.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-card border-t border-border rounded-t-3xl p-4 max-h-[40vh] overflow-y-auto"
        >
          <h3 className="text-lg font-bold mb-3">المنتجات المضافة ({addedItems.length})</h3>
          <div className="space-y-2">
            {addedItems.map((item, i) => (
              <div key={i} className="bg-muted rounded-xl p-3 text-sm font-medium flex items-center gap-2">
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">اضغط على المايك لإضافة منتج آخر</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VoiceSearch;
