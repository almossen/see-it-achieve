import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Package, CheckCircle, LogOut, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const navItems = [
  { to: "/driver", icon: Package, label: "الطلبات النشطة", end: true },
  { to: "/driver/completed", icon: CheckCircle, label: "المكتملة" },
];

const DriverLayout = () => {
  const { user, tenantId, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !tenantId) return;
    const fetchDriver = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, is_available")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setDriverId(data.id);
        setIsAvailable(data.is_available ?? true);
      }
    };
    fetchDriver();
  }, [user, tenantId]);

  const toggleAvailability = async () => {
    if (!driverId) return;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    const { error } = await supabase
      .from("drivers")
      .update({ is_available: newVal })
      .eq("id", driverId);
    if (error) {
      setIsAvailable(!newVal);
      toast.error("حدث خطأ في تحديث الحالة");
    } else {
      toast.success(newVal ? "أنت متاح الآن" : "تم إيقاف التوفر");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-tajawal">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🚗</div>
          <p className="text-xl text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-tajawal pb-[72px]">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">لوحة السائق</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", isAvailable ? "text-primary" : "text-muted-foreground")}>
              {isAvailable ? "متاح" : "غير متاح"}
            </span>
            <Switch checked={isAvailable} onCheckedChange={toggleAvailability} />
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        <Outlet context={{ driverId, isAvailable }} />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border h-[72px] flex items-center justify-around px-2 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 px-6 rounded-xl min-w-[80px] min-h-[52px] justify-center transition-colors",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default DriverLayout;
