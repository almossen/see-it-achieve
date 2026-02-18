import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock } from "lucide-react";

interface DriverContext {
  driverId: string | null;
  isAvailable: boolean;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار التعيين", color: "bg-yellow-100 text-yellow-800" },
  assigned: { label: "تم التعيين", color: "bg-blue-100 text-blue-800" },
  processing: { label: "قيد التنفيذ", color: "bg-primary/10 text-primary" },
};

const DriverHome = () => {
  const { tenantId } = useAuth();
  const { driverId } = useOutletContext<DriverContext>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!driverId || !tenantId) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("tenant_id", tenantId)
      .eq("driver_id", driverId)
      .in("status", ["assigned", "processing"])
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [driverId, tenantId]);

  // Realtime subscription
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel("driver-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId, tenantId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="p-6 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <p className="text-lg text-muted-foreground">لم يتم تسجيلك كسائق بعد</p>
        <p className="text-sm text-muted-foreground mt-2">تواصل مع مدير العائلة لإضافتك كسائق</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Package className="h-6 w-6 text-primary" />
        الطلبات النشطة
        {orders.length > 0 && (
          <Badge variant="secondary" className="text-sm">{orders.length}</Badge>
        )}
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg text-muted-foreground">لا توجد طلبات نشطة</p>
          <p className="text-sm text-muted-foreground mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
        </div>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">طلب #{order.id.slice(0, 6)}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[order.status]?.color || ""}`}>
                  {statusMap[order.status]?.label || order.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(order.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{order.order_items?.length || 0} منتج</span>
                {order.total > 0 && <span>{order.total} ر.س</span>}
              </div>
              {order.notes && (
                <p className="text-sm bg-muted/50 p-2 rounded-lg">{order.notes}</p>
              )}
              <Button
                className="w-full h-12 text-base"
                onClick={() => navigate(`/driver/order/${order.id}`)}
              >
                {order.status === "assigned" ? "ابدأ التنفيذ" : "متابعة التنفيذ"}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default DriverHome;
