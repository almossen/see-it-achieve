import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "تم التعيين",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  processing: "bg-primary/10 text-primary",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const OrdersPage = () => {
  const { tenantId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const fetchData = async () => {
    if (!tenantId) return;
    const [ordersRes, driversRes] = await Promise.all([
      supabase.from("orders")
        .select("*, profiles!orders_created_by_fkey(full_name), drivers(id, profiles!drivers_user_id_fkey(full_name))")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase.from("drivers")
        .select("id, profiles!drivers_user_id_fkey(full_name)")
        .eq("tenant_id", tenantId)
        .eq("is_available", true),
    ]);
    setOrders(ordersRes.data || []);
    setDrivers(driversRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const openDetail = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems(data || []);
  };

  const updateStatus = async (orderId: string, status: "pending" | "assigned" | "processing" | "completed" | "cancelled") => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    toast.success("تم تحديث الحالة");
    fetchData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    await supabase.from("orders").update({ driver_id: driverId, status: "assigned" }).eq("id", orderId);
    toast.success("تم تعيين السائق");
    fetchData();
  };

  const sendWhatsApp = (order: any) => {
    const driverPhone = order.drivers?.profiles?.phone || "";
    const msg = `طلب جديد #${order.id.slice(0, 8)}\nالمجموع: ${order.total || 0} ر.س\nملاحظات: ${order.notes || "لا يوجد"}`;
    window.open(`https://wa.me/${driverPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = orders.filter((o) => filterStatus === "all" || o.status === filterStatus);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">إدارة الطلبات</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">طلب #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {order.profiles?.full_name} — {new Date(order.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", statusColors[order.status])}>
                {statusLabels[order.status]}
              </span>
              {order.total > 0 && <span className="text-sm font-bold text-primary">{order.total} ر.س</span>}
              <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                <Eye className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد طلبات</p>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الحالة</span>
                <Select value={selectedOrder.status} onValueChange={(v: any) => updateStatus(selectedOrder.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">السائق</span>
                <Select
                  value={selectedOrder.driver_id || ""}
                  onValueChange={(v) => assignDriver(selectedOrder.id, v)}
                >
                  <SelectTrigger className="w-40"><SelectValue placeholder="اختر سائق" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">المنتجات</p>
                {orderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد منتجات</p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm">{item.product_name} × {item.quantity}</span>
                        {item.price && <span className="text-sm font-medium">{item.price} ر.س</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrder.driver_id && (
                <Button variant="outline" className="w-full gap-2" onClick={() => sendWhatsApp(selectedOrder)}>
                  📱 إرسال عبر واتساب
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
