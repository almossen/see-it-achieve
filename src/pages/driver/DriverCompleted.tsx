import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Package } from "lucide-react";

interface DriverContext {
  driverId: string | null;
}

const DriverCompleted = () => {
  const { tenantId } = useAuth();
  const { driverId } = useOutletContext<DriverContext>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!driverId || !tenantId) return;
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("tenant_id", tenantId)
        .eq("driver_id", driverId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(20);
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [driverId, tenantId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <CheckCircle className="h-6 w-6 text-primary" />
        الطلبات المكتملة
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-lg text-muted-foreground">لا توجد طلبات مكتملة بعد</p>
        </div>
      ) : (
        orders.map((order) => {
          const foundItems = order.order_items?.filter((i: any) => i.status === "found").length || 0;
          const notFoundItems = order.order_items?.filter((i: any) => i.status === "not_found").length || 0;
          const substituted = order.order_items?.filter((i: any) => i.status === "substituted").length || 0;

          return (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">طلب #{order.id.slice(0, 6)}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    مكتمل ✅
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(order.updated_at).toLocaleDateString("ar-SA")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {order.order_items?.length || 0} منتج
                  </span>
                  {order.total > 0 && <span>{order.total} ر.س</span>}
                </div>
                <div className="flex gap-2 flex-wrap text-xs">
                  {foundItems > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">تم: {foundItems}</span>
                  )}
                  {notFoundItems > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">غير موجود: {notFoundItems}</span>
                  )}
                  {substituted > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">بديل: {substituted}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default DriverCompleted;
