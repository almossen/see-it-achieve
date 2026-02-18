import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

const ElderOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  }, [user]);

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
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => toggleExpand(order.id)}
              className="w-full bg-card border border-border rounded-xl p-4 text-right"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{statusEmoji[order.status]}</span>
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

              {/* Expanded items */}
              {expandedId === order.id && orderItems[order.id] && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {orderItems[order.id].map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.product_name} × {item.quantity}</span>
                      {item.price && <span className="text-muted-foreground">{item.price} ر.س</span>}
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg mt-2">📝 {order.notes}</p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ElderOrders;
