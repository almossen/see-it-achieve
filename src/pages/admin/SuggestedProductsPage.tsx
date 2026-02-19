import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SuggestedProductsPage = () => {
  const { tenantId } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState<any | null>(null);
  const [form, setForm] = useState({ name_ar: "", emoji: "", price: "", unit: "حبة", category_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;
    const [{ data: sugData }, { data: catData }, { data: profilesData }] = await Promise.all([
      supabase
        .from("suggested_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
      supabase.from("profiles").select("user_id, full_name").eq("tenant_id", tenantId),
    ]);

    const profilesMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => { profilesMap[p.user_id] = p.full_name; });

    setSuggestions((sugData || []).map((s: any) => ({ ...s, suggested_by_name: profilesMap[s.suggested_by] || "غير معروف" })));
    setCategories(catData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const openAddDialog = (suggestion: any) => {
    setAddDialog(suggestion);
    setForm({
      name_ar: suggestion.name_ar,
      emoji: "",
      price: "",
      unit: suggestion.unit || "حبة",
      category_id: "",
    });
  };

  const handleAddProduct = async () => {
    if (!tenantId || !addDialog) return;
    setSubmitting(true);

    const { error } = await supabase.from("products").insert({
      tenant_id: tenantId,
      name_ar: form.name_ar,
      emoji: form.emoji || null,
      price: form.price ? parseFloat(form.price) : null,
      unit: form.unit,
      category_id: form.category_id || null,
    });

    if (error) {
      toast.error("خطأ في إضافة المنتج", { description: error.message });
    } else {
      await supabase.from("suggested_products").update({ status: "added" }).eq("id", addDialog.id);
      toast.success(`تمت إضافة "${form.name_ar}" للمنتجات`);
      setAddDialog(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDismiss = async (id: string) => {
    await supabase.from("suggested_products").update({ status: "dismissed" }).eq("id", id);
    toast.success("تم تجاهل الاقتراح");
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">مقترحات المنتجات</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 مقترحات المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-1">منتجات طلبها كبار السن بالصوت ولم تكن موجودة بالقائمة</p>
        </div>
        {suggestions.length > 0 && (
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
            {suggestions.length} مقترح
          </span>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">✨</p>
          <p className="text-lg font-medium">لا توجد مقترحات جديدة</p>
          <p className="text-sm text-muted-foreground">ستظهر هنا المنتجات التي يطلبها كبار السن ولا تجدها في القائمة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">📝 {s.name_ar}</p>
                    {s.unit && <p className="text-sm text-muted-foreground">الوحدة: {s.unit}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  طلبها: {s.suggested_by_name} • {new Date(s.created_at).toLocaleDateString("ar-SA")}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={() => openAddDialog(s)}>
                    <Plus className="h-4 w-4" />
                    أضف للمنتجات
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDismiss(s.id)}>
                    <X className="h-4 w-4" />
                    تجاهل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة "{addDialog?.name_ar}" كمنتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم بالعربية</Label>
              <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
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
                    <SelectItem value="كرتون">كرتون</SelectItem>
                    <SelectItem value="علبة">علبة</SelectItem>
                    <SelectItem value="كيس">كيس</SelectItem>
                    <SelectItem value="ربطة">ربطة</SelectItem>
                    <SelectItem value="حزمة">حزمة</SelectItem>
                    <SelectItem value="لتر">لتر</SelectItem>
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
            <Button onClick={handleAddProduct} disabled={submitting} className="w-full">
              {submitting ? "جاري الإضافة..." : "✅ إضافة المنتج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuggestedProductsPage;
