import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, GripVertical, Pencil, Trash2, Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_UNIT_OPTIONS = [
  { value: "حبة", emoji: "1️⃣" },
  { value: "كرتون", emoji: "📦" },
  { value: "صحن", emoji: "🍽️" },
  { value: "كيلو", emoji: "⚖️" },
  { value: "كيس", emoji: "🛍️" },
  { value: "حزمة", emoji: "🌿" },
  { value: "درزن", emoji: "🥚" },
  { value: "علبة", emoji: "🥫" },
  { value: "ربطة", emoji: "🧻" },
];

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
  const [selectedUnits, setSelectedUnits] = useState<string[]>(["حبة", "كرتون", "كيلو"]);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${tenantId}/categories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error("خطأ في رفع الصورة", { description: error.message });
      return null;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let image_url = existingImageUrl;
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (uploaded) image_url = uploaded;
    }

    const payload = { ...form, image_url, unit_options: selectedUnits };

    if (editingId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("categories").insert({
        ...payload,
        tenant_id: tenantId!,
        sort_order: categories.length,
      });
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تمت الإضافة");
    }

    setSubmitting(false);
    setDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name_ar: "", name_en: "", emoji: "🛒" });
    setSelectedUnits(["حبة", "كرتون", "كيلو"]);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
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
    setSelectedUnits(cat.unit_options || ["حبة", "كرتون", "كيلو"]);
    setExistingImageUrl(cat.image_url || null);
    setImagePreview(cat.image_url || null);
    setImageFile(null);
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
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />إضافة فئة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Image upload section */}
                <div className="space-y-2">
                  <Label>صورة الفئة (اختياري)</Label>
                  {imagePreview ? (
                    <div className="relative w-24 h-24 mx-auto">
                      <img src={imagePreview} alt="معاينة" className="w-24 h-24 object-cover rounded-xl border" />
                      <button type="button" onClick={clearImage} className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center">
                      <input type="file" accept="image/*" capture="environment" ref={cameraRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
                      <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => cameraRef.current?.click()}>
                        <Camera className="h-4 w-4" /> كاميرا
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => fileRef.current?.click()}>
                        <ImagePlus className="h-4 w-4" /> اختيار صورة
                      </Button>
                    </div>
                  )}
                </div>

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
                {/* Unit options picker */}
                <div className="space-y-2">
                  <Label>الوحدات المتاحة</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_UNIT_OPTIONS.map((u) => {
                      const isSelected = selectedUnits.includes(u.value);
                      return (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => {
                            setSelectedUnits((prev) =>
                              isSelected
                                ? prev.filter((v) => v !== u.value)
                                : [...prev, u.value]
                            );
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:border-border"
                          )}
                        >
                          <span>{u.emoji}</span>
                          <span>{u.value}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedUnits.length === 0 && (
                    <p className="text-xs text-destructive">اختر وحدة واحدة على الأقل</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting || selectedUnits.length === 0}>
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
              {cat.image_url ? (
                <img src={cat.image_url} alt={cat.name_ar} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{cat.name_ar}</p>
                {cat.name_en && <p className="text-xs text-muted-foreground">{cat.name_en}</p>}
                {cat.unit_options && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.unit_options.join(" · ")}
                  </p>
                )}
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
