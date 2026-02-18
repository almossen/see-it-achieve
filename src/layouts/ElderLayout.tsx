import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Home, Heart, ShoppingCart, ClockArrowUp, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";

const navItems = [
  { to: "/elder", icon: Home, label: "الرئيسية", end: true },
  { to: "/elder/favorites", icon: Heart, label: "المفضلة" },
  { to: "/elder/cart", icon: ShoppingCart, label: "السلة" },
  { to: "/elder/orders", icon: ClockArrowUp, label: "طلباتي" },
];

const ElderLayout = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { items } = useCart();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-tajawal">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🛒</div>
          <p className="text-xl text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-tajawal pb-[72px]">
      {/* Top header - simplified */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <span className="text-lg font-bold text-primary">طلباتي</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            أهلاً {profile?.full_name?.split(" ")[0]}
          </span>
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom nav - 72px height, large touch targets */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border h-[72px] flex items-center justify-around px-2 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl min-w-[64px] min-h-[52px] justify-center transition-colors relative",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
            {/* Cart badge */}
            {item.to === "/elder/cart" && items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                {items.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default ElderLayout;
