import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Camera, ImagePlus, X } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const ProductsPage = () => {
  const { tenantId } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({
    name_ar: "", name_en: "", emoji: "", price: "", unit: "حبة", category_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!tenantId) return;
    const [prodRes, catRes] = await Promise.all([
      supabase.from("products").select("*, categories(name_ar, emoji)").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
    ]);
    setProducts(prodRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${tenantId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file, { upsert: true });
    if (error) {
      toast.error("خطأ في رفع الصورة");
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      setUploadingImage(true);
      imageUrl = await uploadImage(imageFile);
      setUploadingImage(false);
    }

    const payload: any = {
      name_ar: form.name_ar,
      name_en: form.name_en || null,
      emoji: form.emoji || null,
      price: form.price ? parseFloat(form.price) : null,
      unit: form.unit,
      category_id: form.category_id || null,
      tenant_id: tenantId!,
    };

    if (imageUrl) payload.image_url = imageUrl;

    if (editingId) {
      const { tenant_id, ...updatePayload } = payload;
      const { error } = await supabase.from("products").update(updatePayload).eq("id", editingId);
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error("خطأ", { description: error.message });
      else toast.success("تمت الإضافة");
    }

    setSubmitting(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name_ar: "", name_en: "", emoji: "", price: "", unit: "حبة", category_id: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name_ar: p.name_ar,
      name_en: p.name_en || "",
      emoji: p.emoji || "",
      price: p.price?.toString() || "",
      unit: p.unit || "حبة",
      category_id: p.category_id || "",
    });
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast.success("تم الحذف");
    fetchData();
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name_ar.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || p.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">إدارة المنتجات</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />إضافة منتج</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربية</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>الاسم بالإنجليزية</Label>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>الرمز</Label>
                  <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-xl text-center" maxLength={4} placeholder="🥕" />
                </div>
                <div className="space-y-2">
                  <Label>السعر</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} dir="ltr" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>الوحدة</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="حبة">حبة</SelectItem>
                      <SelectItem value="كيلو">كيلو</SelectItem>
                      <SelectItem value="لتر">لتر</SelectItem>
                      <SelectItem value="علبة">علبة</SelectItem>
                      <SelectItem value="كيس">كيس</SelectItem>
                      <SelectItem value="ربطة">ربطة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>صورة المنتج</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                />
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="w-full h-40 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-7 w-7"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      الكاميرا
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                      اختر صورة
                    </Button>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting || uploadingImage}>
                {uploadingImage ? "جاري رفع الصورة..." : submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المنتج"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="كل الفئات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4 text-center space-y-2">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name_ar} className="w-full h-24 object-cover rounded-lg mb-2" />
              ) : (
                <div className="text-4xl mb-2">{product.emoji || "📦"}</div>
              )}
              <p className="font-medium text-sm truncate">{product.name_ar}</p>
              {product.categories && (
                <p className="text-xs text-muted-foreground">{product.categories.emoji} {product.categories.name_ar}</p>
              )}
              {product.price && (
                <p className="text-sm font-bold text-primary">{product.price} ر.س / {product.unit}</p>
              )}
              <div className="flex gap-1 justify-center pt-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {products.length === 0 ? "لا توجد منتجات بعد" : "لا توجد نتائج مطابقة"}
        </p>
      )}
    </div>
  );
};

export default ProductsPage;
