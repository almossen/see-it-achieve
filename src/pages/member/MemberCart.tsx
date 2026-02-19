import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Minus, Trash2, ShoppingCart, Send } from "lucide-react";

const MemberCart = () => {
  const { user, tenantId } = useAuth();
  const { items, addItem, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const handleSubmit = async () => {
    if (!user || !tenantId || items.length === 0) return;
    setSubmitting(true);

    const { data: order, error } = await supabase.from("orders").insert({
      created_by: user.id,
      tenant_id: tenantId,
      notes,
      total,
      status: "pending",
    }).select().single();

    if (error || !order) {
      toast.error("خطأ في إرسال الطلب");
      setSubmitting(false);
      return;
    }

    await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit || null,
      }))
    );

    clearCart();
    toast.success("تم إرسال الطلب بنجاح!");
    setSubmitting(false);
    navigate("/member/orders");
  };

  if (items.length === 0) {
    return (
      <div className="p-4 text-center py-16">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">السلة فارغة</p>
        <Button variant="link" onClick={() => navigate("/member")} className="mt-2">
          تصفح المنتجات
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">سلة المشتريات</h1>

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.product_id}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-xl">{item.emoji || "📦"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.price && <p className="text-xs text-muted-foreground">{item.price} ر.س</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => removeItem(item.product_id)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => addItem(item)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Textarea placeholder="ملاحظات إضافية..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" rows={2} />

      {total > 0 && (
        <div className="flex justify-between items-center bg-muted rounded-lg px-4 py-3">
          <span className="font-medium">الإجمالي</span>
          <span className="font-bold text-primary">{total} ر.س</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={clearCart} className="gap-1">
          <Trash2 className="h-3 w-3" />
          إفراغ
        </Button>
        <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
          <Send className="h-4 w-4" />
          {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
        </Button>
      </div>
    </div>
  );
};

export default MemberCart;
