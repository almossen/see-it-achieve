import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ArrowRight, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Synonym {
  id: string;
  from_word: string;
  to_word: string;
  created_at: string;
}

// Default synonyms to seed for a new tenant
const DEFAULT_SYNONYMS = [
  { from_word: "بندورة", to_word: "طماطم" },
  { from_word: "بنادورة", to_word: "طماطم" },
  { from_word: "كوسة", to_word: "كوسا" },
  { from_word: "كوسى", to_word: "كوسا" },
  { from_word: "باذنجان", to_word: "بادنجان" },
  { from_word: "فاصولياء", to_word: "فاصوليا" },
  { from_word: "بطاطا", to_word: "بطاطس" },
  { from_word: "موزة", to_word: "موز" },
  { from_word: "تفاحة", to_word: "تفاح" },
  { from_word: "برتقالة", to_word: "برتقال" },
  { from_word: "ليمونة", to_word: "ليمون" },
  { from_word: "مانجة", to_word: "مانجو" },
  { from_word: "فريز", to_word: "فراولة" },
  { from_word: "فروج", to_word: "دجاج" },
  { from_word: "فراخ", to_word: "دجاج" },
  { from_word: "بيضة", to_word: "بيض" },
  { from_word: "لبن", to_word: "حليب" },
  { from_word: "يوغرت", to_word: "زبادي" },
  { from_word: "بصلة", to_word: "بصل" },
  { from_word: "ثومة", to_word: "ثوم" },
  { from_word: "جزرة", to_word: "جزر" },
];

const SynonymsPage = () => {
  const { tenantId } = useAuth();
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromWord, setFromWord] = useState("");
  const [toWord, setToWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchSynonyms = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("voice_synonyms")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("from_word");
    if (!error) setSynonyms(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSynonyms();
  }, [tenantId]);

  const handleAdd = async () => {
    if (!fromWord.trim() || !toWord.trim() || !tenantId) return;
    setAdding(true);
    const { error } = await supabase.from("voice_synonyms").insert({
      tenant_id: tenantId,
      from_word: fromWord.trim(),
      to_word: toWord.trim(),
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("هذه الكلمة مضافة مسبقاً");
      } else {
        toast.error("خطأ في الإضافة", { description: error.message });
      }
    } else {
      toast.success(`تمت إضافة: ${fromWord} ← ${toWord}`);
      setFromWord("");
      setToWord("");
      fetchSynonyms();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, word: string) => {
    const { error } = await supabase
      .from("voice_synonyms")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("خطأ في الحذف");
    } else {
      toast.success(`تم حذف: ${word}`);
      setSynonyms((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSeedDefaults = async () => {
    if (!tenantId) return;
    setSeeding(true);
    let added = 0;
    for (const syn of DEFAULT_SYNONYMS) {
      const { error } = await supabase.from("voice_synonyms").insert({
        tenant_id: tenantId,
        from_word: syn.from_word,
        to_word: syn.to_word,
      });
      if (!error) added++;
    }
    toast.success(`تمت إضافة ${added} مرادف افتراضي`);
    fetchSynonyms();
    setSeeding(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Languages className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">مرادفات البحث الصوتي</h1>
          <p className="text-sm text-muted-foreground">
            تسمح للنظام بفهم اللهجات والأسماء البديلة للمنتجات
          </p>
        </div>
      </div>

      {/* Seed defaults */}
      {synonyms.length === 0 && !loading && (
        <div className="bg-muted/60 border border-dashed border-border rounded-xl p-5 text-center space-y-3">
          <p className="text-sm text-muted-foreground">لا توجد مرادفات بعد. يمكنك إضافة المرادفات الشائعة تلقائياً.</p>
          <Button onClick={handleSeedDefaults} disabled={seeding} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {seeding ? "جاري الإضافة..." : "إضافة المرادفات الافتراضية"}
          </Button>
        </div>
      )}

      {/* Add form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">إضافة مرادف جديد</h2>
        <div className="flex items-center gap-2">
          <Input
            value={fromWord}
            onChange={(e) => setFromWord(e.target.value)}
            placeholder="الكلمة المنطوقة (مثل: بندورة)"
            className="flex-1 text-right"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex-shrink-0 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 hidden rtl:block" />
            <ArrowRight className="h-4 w-4 block rtl:hidden" />
          </div>
          <Input
            value={toWord}
            onChange={(e) => setToWord(e.target.value)}
            placeholder="اسم المنتج في القائمة (مثل: طماطم)"
            className="flex-1 text-right"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !fromWord.trim() || !toWord.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          عند قول الكلمة المنطوقة، سيبحث النظام تلقائياً باسم المنتج في القائمة.
        </p>
      </div>

      {/* List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">المرادفات ({synonyms.length})</h2>
          {synonyms.length > 0 && (
            <Button
              onClick={handleSeedDefaults}
              disabled={seeding}
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              إضافة الافتراضية
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : synonyms.length === 0 ? null : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 px-4 py-2 bg-muted/50 text-xs text-muted-foreground font-medium border-b border-border">
              <span>الكلمة المنطوقة</span>
              <span />
              <span>تُترجم إلى</span>
              <span />
            </div>
            <AnimatePresence>
              {synonyms.map((syn) => (
                <motion.div
                  key={syn.id}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-sm">{syn.from_word}</span>
                  <span className="text-muted-foreground text-xs">←</span>
                  <span className="text-primary text-sm font-medium">{syn.to_word}</span>
                  <button
                    onClick={() => handleDelete(syn.id, syn.from_word)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SynonymsPage;
