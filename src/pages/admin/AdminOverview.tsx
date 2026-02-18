import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, CalendarDays, Users, Truck } from "lucide-react";

const AdminOverview = () => {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState({ totalOrders: 0, todayOrders: 0, members: 0, drivers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [ordersRes, todayRes, membersRes, driversRes, recentRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", today),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("orders").select("*, profiles!orders_created_by_fkey(full_name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        totalOrders: ordersRes.count || 0,
        todayOrders: todayRes.count || 0,
        members: membersRes.count || 0,
        drivers: driversRes.count || 0,
      });
      setRecentOrders(recentRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  const statCards = [
    { label: "إجمالي الطلبات", value: stats.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "طلبات اليوم", value: stats.todayOrders, icon: CalendarDays, color: "text-accent" },
    { label: "الأعضاء", value: stats.members, icon: Users, color: "text-blue-500" },
    { label: "السائقين", value: stats.drivers, icon: Truck, color: "text-orange-500" },
  ];

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={cn("h-8 w-8", stat.color)} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">آخر الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">لا توجد طلبات بعد</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      طلب #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", statusColors[order.status])}>
                    {statusLabels[order.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Need cn import
import { cn } from "@/lib/utils";

export default AdminOverview;
