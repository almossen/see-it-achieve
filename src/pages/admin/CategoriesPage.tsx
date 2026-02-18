import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";

const defaultCategories = [
  { name_ar: "خضروات", name_en: "Vegetables", emoji: "🥬" },
  { name_ar: "فواكه", name_en: "Fruits", emoji: "🍎" },
  { name_ar: "لحوم", name_en: "Meat", emoji: "🥩" },
  { name_ar: "ألبان", name_en: "Dairy", emoji: "🥛" },
  { name_ar: "مخبوزات", name_en: "Bakery", emoji: "🍞" },
  { name_ar: "مشروبات", name_en: "Drinks", emoji: "🥤" },
  { name_ar: "منظفات", name_en: "Cleaning", emoji: "🧹" },
  { name_ar: "أخرى", name_en: "Other", emoji: "📦" },
];

const CategoriesPage = () => {
  const { tenantId } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name_ar: "", name_en: "", emoji: "🛒" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [tenantId]);

  const handleLoadDefaults = async () => {
    if (!tenantId) return;
    const rows = defaultCategories.map((c, i) => ({
      ...c,
      tenant_id: tenantId,
      sort_order: i,
    }));
    const { error } = await supabase.from("categories").insert(rows);
    if (error) {
      toast.error("خطأ", { description: error.message });
    } else {
      toast.success("تم تحميل الفئات الافتراضية");
      fetchCategories();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase.from("categories").update(form).eq("id", editingId);
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("categories").insert({
        ...form,
        tenant_id: tenantId!,
        sort_order: categories.length,
      });
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تمت الإضافة");
    }

    setSubmitting(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name_ar: "", name_en: "", emoji: "🛒" });
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("خطأ", { description: error.message });
    else {
      toast.success("تم الحذف");
      fetchCategories();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current }).eq("id", id);
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({ name_ar: cat.name_ar, name_en: cat.name_en || "", emoji: cat.emoji || "🛒" });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">إدارة الفئات</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة الفئات</h1>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={handleLoadDefaults}>
              تحميل الفئات الافتراضية
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingId(null); setForm({ name_ar: "", name_en: "", emoji: "🛒" }); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />إضافة فئة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>الرمز التعبيري</Label>
                  <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-2xl text-center w-20" maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label>الاسم بالعربية</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>الاسم بالإنجليزية (اختياري)</Label>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الفئة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id} className={cat.is_active ? "" : "opacity-50"}>
            <CardContent className="p-4 flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 cursor-grab" />
              <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{cat.name_ar}</p>
                {cat.name_en && <p className="text-xs text-muted-foreground">{cat.name_en}</p>}
              </div>
              <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد فئات — أضف فئات أو حمّل الافتراضيات</p>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
