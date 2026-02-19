import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Mic, MicOff, X, Check } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VoiceSearchProps {
  onClose: () => void;
}

// Known units that an elder might say
const KNOWN_UNITS = ["كرتون", "كيلو", "حبة", "حزمة", "علبة", "كيس", "لتر", "باكيت", "صندوق", "ربطة", "طبق", "قطعة"];

function parseVoiceQuery(raw: string): { productQuery: string; detectedUnit: string | null } {
  const trimmed = raw.trim();
  for (const unit of KNOWN_UNITS) {
    if (trimmed.startsWith(unit + " ")) {
      return { productQuery: trimmed.slice(unit.length + 1).trim(), detectedUnit: unit };
    }
    if (trimmed.endsWith(" " + unit)) {
      return { productQuery: trimmed.slice(0, trimmed.length - unit.length - 1).trim(), detectedUnit: unit };
    }
  }
  return { productQuery: trimmed, detectedUnit: null };
}

const VoiceSearch = ({ onClose }: VoiceSearchProps) => {
  const { tenantId, user } = useAuth();
  const { addItem } = useCart();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

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
        handleVoiceResult(finalTranscript);
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

  const handleVoiceResult = async (query: string) => {
    if (!tenantId || !query.trim()) return;

    const { productQuery, detectedUnit } = parseVoiceQuery(query);

    // Search for existing product
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .or(`name_ar.ilike.%${productQuery}%,name_en.ilike.%${productQuery}%`)
      .limit(5);

    if (data && data.length > 0) {
      // Found a match - add the best match directly
      const product = data[0];
      addItem({
        product_id: product.id,
        name: product.name_ar,
        emoji: product.emoji,
        price: product.price,
        unit: detectedUnit || product.unit,
        image_url: product.image_url,
      });
      const unitLabel = detectedUnit || product.unit || "";
      setAddedItems(prev => [...prev, `✅ ${product.name_ar} (${unitLabel})`]);
      toast.success(`تمت إضافة ${product.name_ar} للسلة`);
    } else {
      // Product not found - add as custom item with the spoken name
      const customId = `custom_${Date.now()}`;
      addItem({
        product_id: customId,
        name: productQuery,
        emoji: "📝",
        unit: detectedUnit || "حبة",
        is_custom: true,
      });
      setAddedItems(prev => [...prev, `📝 ${productQuery} (${detectedUnit || "حبة"}) - غير موجود بالقائمة`]);
      toast.info(`تمت إضافة "${productQuery}" كمنتج مخصص`);

      // Save to suggested_products for admin review
      await supabase.from("suggested_products").insert({
        tenant_id: tenantId,
        name_ar: productQuery,
        unit: detectedUnit,
        suggested_by: user?.id,
      });
    }
  };

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
