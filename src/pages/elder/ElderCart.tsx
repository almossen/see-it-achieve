import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, Trash2, ShoppingCart, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ElderCart = () => {
  const { tenantId, user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, total, notes, setNotes } = useCart();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const fetchDrivers = async () => {
      const [{ data: driversData }, { data: tenantData }, { data: profilesData }] = await Promise.all([
        supabase
          .from("drivers")
          .select("id, user_id, whatsapp_number")
          .eq("tenant_id", tenantId)
          .eq("is_available", true),
        supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single(),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("tenant_id", tenantId),
      ]);

      const profilesMap: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => { profilesMap[p.user_id] = p.full_name; });

      const availableDrivers = (driversData || []).map((d: any) => ({
        ...d,
        full_name: profilesMap[d.user_id] || "سائق",
      }));
      setDrivers(availableDrivers);

      // Auto-assign: if 1 driver, select it. If multiple, use default from settings.
      if (availableDrivers.length === 1) {
        setSelectedDriver(availableDrivers[0].id);
      } else if (availableDrivers.length > 1 && (tenantData as any)?.default_driver_id) {
        const defaultId = (tenantData as any).default_driver_id;
        if (availableDrivers.some((d: any) => d.id === defaultId)) {
          setSelectedDriver(defaultId);
        }
      }
    };
    fetchDrivers();
  }, [tenantId]);

  const handleSubmit = async () => {
    if (!user || !tenantId || items.length === 0) return;
    setSubmitting(true);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        created_by: user.id,
        driver_id: selectedDriver || null,
        status: selectedDriver ? "assigned" : "pending",
        notes,
        total,
      })
      .select()
      .single();

    if (orderError) {
      toast.error("خطأ في إنشاء الطلب", { description: orderError.message });
      setSubmitting(false);
      return;
    }

    // Insert order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.is_custom ? null : item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit || null,
    }));

    await supabase.from("order_items").insert(orderItems);

    // Send WhatsApp if driver selected
    if (selectedDriver) {
      const driver = drivers.find((d) => d.id === selectedDriver);
      if (driver?.whatsapp_number) {
        const itemsList = items.map((i) => `• ${i.name} × ${i.quantity} ${i.unit || ""}`).join("\n");
        const msg = `🛒 طلب جديد!\n\n${itemsList}\n\n💰 المجموع: ${total} ر.س\n📝 ملاحظات: ${notes || "لا يوجد"}`;
        window.open(`https://wa.me/${driver.whatsapp_number}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    }

    clearCart();
    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <CheckCircle className="h-24 w-24 text-primary mx-auto mb-6" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">تم إرسال طلبك! 🎉</h2>
        <p className="text-muted-foreground text-center mb-8">سيتم تجهيز طلبك في أقرب وقت</p>
        <Button onClick={() => navigate("/elder")} size="lg" className="h-14 px-8 text-lg rounded-xl">
          الرجوع للرئيسية
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <ShoppingCart className="h-20 w-20 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">السلة فارغة</h2>
        <p className="text-muted-foreground mb-6">أضف منتجات من الأقسام أو بالبحث الصوتي</p>
        <Button onClick={() => navigate("/elder")} size="lg" className="h-14 px-8 text-lg rounded-xl">
          تصفح الأقسام
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🛒 السلة</h1>

      {/* Cart items */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.product_id}
              layout
              exit={{ opacity: 0, x: -100 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <span className="text-3xl flex-shrink-0">{item.emoji || "📦"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{item.name} <span className="text-muted-foreground font-normal">({item.unit || "حبة"})</span></p>
                {item.price && (
                  <p className="text-xs text-primary font-medium">{(item.price * item.quantity).toFixed(2)} ر.س</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <button onClick={() => removeItem(item.product_id)} className="p-2 text-destructive">
                <Trash2 className="h-5 w-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">📝 ملاحظات (اختياري)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="مثال: الطماطم تكون ناضجة..."
          className="min-h-[80px] text-base rounded-xl"
        />
      </div>

      {/* Driver selection */}
      {drivers.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">🚗 اختر السائق</label>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="h-12 text-base rounded-xl">
              <SelectValue placeholder="اختر سائق (اختياري)" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name || "سائق"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Total + Submit */}
      <div className="bg-muted rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>المجموع</span>
          <span className="text-primary">{total.toFixed(2)} ر.س</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 text-lg rounded-xl"
          size="lg"
        >
          {submitting ? "جاري الإرسال..." : "✅ أرسل الطلب"}
        </Button>
      </div>
    </div>
  );
};

export default ElderCart;
