import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceSearchProps {
  onClose: () => void;
}

const VoiceSearch = ({ onClose }: VoiceSearchProps) => {
  const { tenantId } = useAuth();
  const { addItem } = useCart();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser speech recognition support
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

      // If final result, search products
      if (event.results[event.results.length - 1].isFinal) {
        searchProducts(finalTranscript);
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

    return () => {
      recognition.abort();
    };
  }, []);

  const searchProducts = async (query: string) => {
    if (!tenantId || !query.trim()) return;
    setSearching(true);

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%`)
      .limit(10);

    setResults(data || []);
    setSearching(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      setResults([]);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleAddProduct = (product: any) => {
    addItem({
      product_id: product.id,
      name: product.name_ar,
      emoji: product.emoji,
      price: product.price,
      unit: product.unit,
    });
    toast.success(`تمت إضافة ${product.name_ar} للسلة`);
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
        <h2 className="text-xl font-bold">🎤 البحث الصوتي</h2>
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
          {isListening ? "جاري الاستماع... تكلّم الآن" : "اضغط للتحدث"}
        </p>

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

      {/* Results */}
      {(results.length > 0 || searching) && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-card border-t border-border rounded-t-3xl p-4 max-h-[50vh] overflow-y-auto"
        >
          <h3 className="text-lg font-bold mb-3">
            {searching ? "جاري البحث..." : `نتائج البحث (${results.length})`}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {results.map((product) => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddProduct(product)}
                className="bg-muted rounded-xl p-4 text-center space-y-2 min-h-[100px] flex flex-col items-center justify-center"
              >
                <span className="text-4xl">{product.emoji || "📦"}</span>
                <p className="text-sm font-bold">{product.name_ar}</p>
                {product.price && (
                  <p className="text-xs text-primary font-bold">{product.price} ر.س</p>
                )}
                <span className="text-xs text-muted-foreground">اضغط للإضافة ➕</span>
              </motion.button>
            ))}
          </div>
          {results.length === 0 && !searching && transcript && (
            <p className="text-center text-muted-foreground py-6">لم يتم العثور على منتجات مطابقة</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default VoiceSearch;
