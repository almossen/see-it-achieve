import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Camera, ArrowRight, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus = "pending" | "found" | "not_found" | "substituted";

interface OrderItem {
  id: string;
  product_name: string;
  product_id: string | null;
  quantity: number;
  price: number | null;
  status: string | null;
  unit: string | null;
  substitute_image_url: string | null;
  substitute_approved: boolean | null;
  product_image?: string | null;
  product_unit?: string | null;
}

const statusConfig: Record<ItemStatus, { label: string; icon: any; className: string }> = {
  pending: { label: "بانتظار", icon: Package, className: "bg-muted text-muted-foreground" },
  found: { label: "تم ✅", icon: Check, className: "bg-green-100 text-green-800 border-green-300" },
  not_found: { label: "غير موجود ❌", icon: X, className: "bg-red-100 text-red-800 border-red-300" },
  substituted: { label: "بديل 📷", icon: Camera, className: "bg-blue-100 text-blue-800 border-blue-300" },
};

const DriverOrderProcess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchItems = async () => {
    if (!orderId) return;
    const { data: itemsData } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    const orderItems = itemsData || [];
    const productIds = orderItems.map((i: any) => i.product_id).filter(Boolean);
    let productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, image_url, unit")
        .in("id", productIds);
      (productsData || []).forEach((p: any) => { productsMap[p.id] = p; });
    }
    setItems(orderItems.map((i: any) => ({
      ...i,
      product_image: productsMap[i.product_id]?.image_url || null,
      product_unit: productsMap[i.product_id]?.unit || null,
    })));
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      const { data: orderData } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (orderData) {
        setOrder(orderData);
        if (orderData.status === "assigned") {
          await supabase.from("orders").update({ status: "processing" }).eq("id", orderId);
        }
      }
      await fetchItems();
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  // Realtime: listen for substitute approval changes
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-items-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "order_items",
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.substitute_approved !== null) {
          toast(
            updated.substitute_approved
              ? `✅ العميل وافق على بديل "${updated.substitute_name || updated.product_name}"`
              : `❌ العميل رفض بديل "${updated.substitute_name || updated.product_name}"`,
            { duration: 5000 }
          );
        }
        setItems((prev) => prev.map((i) =>
          i.id === updated.id ? { ...i, ...updated } : i
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const updateItemStatus = async (itemId: string, status: ItemStatus) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status })
      .eq("id", itemId);
    if (error) {
      toast.error("حدث خطأ");
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
  };

  const handleSubstitute = async (itemId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      toast.loading("جاري رفع صورة البديل...", { id: "upload" });
      
      const fileExt = file.name.split(".").pop();
      const filePath = `${orderId}/${itemId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("substitute-images")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        toast.error("خطأ في رفع الصورة", { id: "upload" });
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from("substitute-images")
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;
      
      // Prompt driver for substitute name
      const name = prompt("اسم المنتج البديل:");
      
      await supabase
        .from("order_items")
        .update({ 
          status: "substituted", 
          substitute_image_url: imageUrl,
          substitute_name: name || "بديل",
          substitute_approved: null 
        })
        .eq("id", itemId);
      
      setItems((prev) => prev.map((i) => 
        i.id === itemId 
          ? { ...i, status: "substituted", substitute_image_url: imageUrl } 
          : i
      ));
      toast.success("تم رفع صورة البديل بنجاح ✅", { id: "upload" });
    };
    input.click();
  };

  const completeOrder = async () => {
    if (!orderId) return;
    
    // Check if any substitutes are pending approval
    const pendingSubstitutes = items.filter(
      (i) => i.status === "substituted" && i.substitute_approved === null
    );
    if (pendingSubstitutes.length > 0) {
      toast.error("يوجد بدائل لم يوافق عليها العميل بعد، انتظر موافقته أولاً");
      return;
    }
    
    setCompleting(true);
    const foundItems = items.filter((i) => i.status === "found" || (i.status === "substituted" && i.substitute_approved === true));
    const total = foundItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

    const { error } = await supabase
      .from("orders")
      .update({ status: "completed", total })
      .eq("id", orderId);
    setCompleting(false);

    if (error) {
      toast.error("حدث خطأ في إكمال الطلب");
    } else {
      toast.success("تم إكمال الطلب بنجاح! 🎉");
      navigate("/driver");
    }
  };

  const allProcessed = items.length > 0 && items.every((i) => i.status && i.status !== "pending");
  const foundCount = items.filter((i) => i.status === "found").length;
  const notFoundCount = items.filter((i) => i.status === "not_found").length;
  const substitutedCount = items.filter((i) => i.status === "substituted").length;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">طلب #{order.id.slice(0, 6)}</h1>
          <p className="text-sm text-muted-foreground">{items.length} منتج</p>
        </div>
      </div>

      {/* Progress summary */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {foundCount > 0 && <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">تم: {foundCount}</Badge>}
          {notFoundCount > 0 && <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">غير موجود: {notFoundCount}</Badge>}
          {substitutedCount > 0 && <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">بديل: {substitutedCount}</Badge>}
          <Badge variant="outline" className="bg-muted">متبقي: {items.filter((i) => !i.status || i.status === "pending").length}</Badge>
        </div>
      )}

      {order.notes && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">ملاحظات:</p>
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item) => {
          const currentStatus = (item.status as ItemStatus) || "pending";
          const config = statusConfig[currentStatus];
          return (
            <Card key={item.id} className={cn("border-2 transition-all", currentStatus !== "pending" ? "border-border/50" : "border-border")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 rounded-xl object-contain bg-muted flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      الكمية: {item.quantity} {item.unit || item.product_unit || ""}
                      {item.price ? ` • ${item.price} ر.س` : ""}
                    </p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap", config.className)}>
                    {config.label}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={currentStatus === "found" ? "default" : "outline"}
                    className={cn("flex-1 h-11", currentStatus === "found" && "bg-green-600 hover:bg-green-700")}
                    onClick={() => updateItemStatus(item.id, "found")}
                  >
                    <Check className="h-4 w-4 ml-1" />
                    تم
                  </Button>
                  <Button
                    size="sm"
                    variant={currentStatus === "not_found" ? "default" : "outline"}
                    className={cn("flex-1 h-11", currentStatus === "not_found" && "bg-red-600 hover:bg-red-700")}
                    onClick={() => updateItemStatus(item.id, "not_found")}
                  >
                    <X className="h-4 w-4 ml-1" />
                    غير موجود
                  </Button>
                  <Button
                    size="sm"
                    variant={currentStatus === "substituted" ? "default" : "outline"}
                    className={cn("flex-1 h-11", currentStatus === "substituted" && "bg-blue-600 hover:bg-blue-700")}
                    onClick={() => handleSubstitute(item.id)}
                  >
                    <Camera className="h-4 w-4 ml-1" />
                    بديل
                  </Button>
                </div>

                {/* Substitute approval status */}
                {currentStatus === "substituted" && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm font-medium",
                    item.substitute_approved === null && "bg-yellow-50 text-yellow-800 border border-yellow-200",
                    item.substitute_approved === true && "bg-green-50 text-green-800 border border-green-200",
                    item.substitute_approved === false && "bg-red-50 text-red-800 border border-red-200",
                  )}>
                    {item.substitute_approved === null && "⏳ بانتظار رد العميل على البديل..."}
                    {item.substitute_approved === true && "✅ العميل وافق على البديل"}
                    {item.substitute_approved === false && "❌ العميل رفض البديل"}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete order button */}
      {allProcessed && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="font-bold text-lg">تم مراجعة جميع المنتجات</p>
              <p className="text-sm text-muted-foreground">
                تم: {foundCount} • غير موجود: {notFoundCount} • بديل: {substitutedCount}
              </p>
            </div>
            <Button
              className="w-full h-14 text-lg"
              onClick={completeOrder}
              disabled={completing}
            >
              {completing ? "جاري الإكمال..." : "إكمال الطلب وتأكيد التوصيل 🚗"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DriverOrderProcess;
