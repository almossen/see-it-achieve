import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "تم التعيين",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusEmoji: Record<string, string> = {
  pending: "⏳",
  assigned: "🚗",
  processing: "📦",
  completed: "✅",
  cancelled: "❌",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  processing: "bg-primary/10 text-primary",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const itemStatusLabels: Record<string, { label: string; color: string }> = {
  found: { label: "موجود ✅", color: "text-green-700 bg-green-50" },
  not_found: { label: "غير متوفر ❌", color: "text-red-700 bg-red-50" },
  substituted: { label: "بديل 📷", color: "text-blue-700 bg-blue-50" },
  pending: { label: "بانتظار", color: "text-muted-foreground bg-muted" },
};

const ElderOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Realtime: notify elder when driver suggests a substitute
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("elder-substitute-notifications")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "order_items",
      }, (payload) => {
        const updated = payload.new as any;
        // Only notify when status changes to substituted (driver suggested a substitute)
        if (updated.status === "substituted" && updated.substitute_image_url) {
          toast.info(
            `📷 السائق اقترح بديلاً لـ "${updated.product_name}"`,
            { duration: 8000 }
          );
          // Refresh items if this order is expanded
          if (expandedId) {
            supabase.from("order_items").select("*").eq("order_id", expandedId)
              .then(({ data }) => {
                if (data) setOrderItems((prev) => ({ ...prev, [expandedId]: data }));
              });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, expandedId]);

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setOrderItems((prev) => ({ ...prev, [orderId]: data || [] }));
    }
  };

  const handleSubstituteDecision = async (itemId: string, orderId: string, approved: boolean) => {
    const { error } = await supabase
      .from("order_items")
      .update({ substitute_approved: approved })
      .eq("id", itemId);

    if (error) {
      toast.error("حدث خطأ");
      return;
    }

    setOrderItems((prev) => ({
      ...prev,
      [orderId]: prev[orderId].map((i) =>
        i.id === itemId ? { ...i, substitute_approved: approved } : i
      ),
    }));
    toast.success(approved ? "تم قبول البديل ✅" : "تم رفض البديل ❌");
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">📋 طلباتي</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📋 طلباتي</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg text-muted-foreground">لا توجد طلبات سابقة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const items = orderItems[order.id] || [];
            const hasSubstitutePending = items.some(
              (i) => i.status === "substituted" && i.substitute_approved === null
            );

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full p-4 text-right"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{statusEmoji[order.status]}</span>
                      {hasSubstitutePending && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                          بدائل بانتظار موافقتك
                        </span>
                      )}
                    </div>
                    <span className={cn("text-xs px-3 py-1 rounded-full font-medium", statusColors[order.status])}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">طلب #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  {order.total > 0 && (
                    <p className="text-sm font-bold text-primary mt-1">{order.total} ر.س</p>
                  )}
                </button>

                {/* Expanded items */}
                {expandedId === order.id && items.length > 0 && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                    {items.map((item) => {
                      const statusInfo = itemStatusLabels[item.status || "pending"];
                      return (
                        <div key={item.id} className="bg-muted/50 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.product_name} × {item.quantity}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusInfo.color)}>
                              {statusInfo.label}
                            </span>
                          </div>
                          {item.price && (
                            <p className="text-xs text-muted-foreground">{item.price} ر.س</p>
                          )}

                          {/* Substitute section */}
                          {item.status === "substituted" && item.substitute_image_url && item.substitute_image_url !== "pending_upload" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                              <div className="flex items-center gap-2 mb-1">
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-bold text-blue-800">
                                  البديل المقترح: {item.substitute_name || "بديل"}
                                </span>
                              </div>
                              <img
                                src={item.substitute_image_url}
                                alt="صورة البديل"
                                className="w-full max-h-48 object-contain rounded-lg bg-white"
                              />
                              {item.substitute_approved === null ? (
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSubstituteDecision(item.id, order.id, true);
                                    }}
                                  >
                                    <Check className="h-5 w-5 ml-1" />
                                    أوافق
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-12 text-base border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSubstituteDecision(item.id, order.id, false);
                                    }}
                                  >
                                    <X className="h-5 w-5 ml-1" />
                                    لا أريد
                                  </Button>
                                </div>
                              ) : (
                                <p className={cn(
                                  "text-sm font-medium text-center py-1 rounded-lg",
                                  item.substitute_approved
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                )}>
                                  {item.substitute_approved ? "✅ تمت الموافقة" : "❌ تم الرفض"}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Not found indicator */}
                          {item.status === "not_found" && (
                            <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
                              ⚠️ هذا المنتج غير متوفر حالياً
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">📝 {order.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ElderOrders;
