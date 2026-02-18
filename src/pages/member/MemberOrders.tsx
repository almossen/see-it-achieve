import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileDown, MessageCircle } from "lucide-react";
import { generateOrderPDF } from "@/lib/pdfExport";
import { sendWhatsAppOrder } from "@/lib/whatsapp";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "تم التعيين",
  processing: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  assigned: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const MemberOrders = () => {
  const { user, tenantId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !tenantId) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("tenant_id", tenantId)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [user, tenantId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-bold">طلباتي</h1>
        {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">طلباتي</h1>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد طلبات بعد</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div>
                    <p className="font-medium text-sm">طلب #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    {expanded === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {expanded === order.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product_name} ×{item.quantity}</span>
                        <span className="text-muted-foreground">{item.price ? `${item.price} ر.س` : "—"}</span>
                      </div>
                    ))}
                    {order.total > 0 && (
                      <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                        <span>الإجمالي</span>
                        <span>{order.total} ر.س</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => generateOrderPDF(order)}>
                        <FileDown className="h-3 w-3" />
                        تصدير PDF
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => sendWhatsAppOrder(order)}>
                        <MessageCircle className="h-3 w-3" />
                        واتساب
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberOrders;
