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
import { Plus, GripVertical, Pencil, Trash2, Camera, ImagePlus, X, Merge, Loader2 } from "lucide-react";
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

  // Merge state
  const [mergeSource, setMergeSource] = useState<any | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [merging, setMerging] = useState(false);
  const [mergeProductCount, setMergeProductCount] = useState<number>(0);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteProductCount, setDeleteProductCount] = useState<number>(0);

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  // Save new order to DB
  const saveOrder = async (reordered: any[]) => {
    const updates = reordered.map((cat, i) =>
      supabase.from("categories").update({ sort_order: i }).eq("id", cat.id)
    );
    await Promise.all(updates);
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...categories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setCategories(reordered);
    setDragOverIndex(null);
    dragIndexRef.current = null;
    saveOrder(reordered);
    toast.success("تم حفظ الترتيب");
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

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

  // Open merge dialog
  const openMerge = async (cat: any) => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId!)
      .eq("category_id", cat.id);
    setMergeProductCount(count || 0);
    setMergeSource(cat);
    setMergeTargetId("");
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId || !tenantId) return;
    setMerging(true);
    const { error: moveError } = await supabase
      .from("products")
      .update({ category_id: mergeTargetId })
      .eq("tenant_id", tenantId)
      .eq("category_id", mergeSource.id);
    if (moveError) {
      toast.error("خطأ في نقل المنتجات", { description: moveError.message });
      setMerging(false);
      return;
    }
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", mergeSource.id);
    if (deleteError) {
      toast.error("خطأ في حذف الفئة", { description: deleteError.message });
    } else {
      toast.success(`تم دمج "${mergeSource.name_ar}" ونقل ${mergeProductCount} منتج`);
    }
    setMerging(false);
    setMergeSource(null);
    fetchCategories();
  };

  // Delete with confirmation
  const openDelete = async (cat: any) => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId!)
      .eq("category_id", cat.id);
    setDeleteProductCount(count || 0);
    setDeleteTarget(cat);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("categories").delete().eq("id", deleteTarget.id);
    if (error) toast.error("خطأ", { description: error.message });
    else {
      toast.success(`تم حذف "${deleteTarget.name_ar}"${deleteProductCount > 0 ? ` (${deleteProductCount} منتج بدون فئة)` : ""}`);
      fetchCategories();
    }
    setDeleteTarget(null);
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
        <div>
          <h1 className="text-2xl font-bold">إدارة الفئات</h1>
          {categories.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">اسحب ↕ لتغيير الترتيب</p>
          )}
        </div>
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
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "transition-all",
              dragOverIndex === index && dragIndexRef.current !== index
                ? "scale-[1.02] opacity-70"
                : ""
            )}
          >
            <Card className={cn(cat.is_active ? "" : "opacity-50", "cursor-grab active:cursor-grabbing")}>
              <CardContent className="p-4 flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                <Button variant="ghost" size="icon" onClick={() => openMerge(cat)} title="دمج مع فئة أخرى">
                  <Merge className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openDelete(cat)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد فئات — أضف فئات أو حمّل الافتراضيات</p>
        )}
      </div>

      {/* Merge Dialog */}
      <Dialog open={!!mergeSource} onOpenChange={(open) => !open && setMergeSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دمج فئة "{mergeSource?.name_ar}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              سيتم نقل {mergeProductCount} منتج إلى الفئة المختارة ثم حذف "{mergeSource?.name_ar}"
            </p>
            <div className="space-y-2">
              <Label>اختر الفئة المستهدفة</Label>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {categories
                  .filter(c => c.id !== mergeSource?.id)
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => setMergeTargetId(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-right transition-all",
                        mergeTargetId === c.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <span className="font-medium text-sm">{c.name_ar}</span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMergeSource(null)}>إلغاء</Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleMerge}
                disabled={!mergeTargetId || merging}
              >
                {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                دمج
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف فئة "{deleteTarget?.name_ar}"؟</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {deleteProductCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                ⚠️ يوجد {deleteProductCount} منتج في هذه الفئة. ستبقى المنتجات بدون فئة بعد الحذف.
                <br />
                💡 يمكنك دمج الفئة بدلاً من حذفها لنقل المنتجات.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">هذه الفئة فارغة وسيتم حذفها نهائياً.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete}>حذف</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
