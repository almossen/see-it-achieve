import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Heart, Plus, Minus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  { value: "حبة", emoji: "1️⃣" },
  { value: "كرتون", emoji: "📦" },
  { value: "درزن", emoji: "🥚" },
  { value: "كيلو", emoji: "⚖️" },
  { value: "حزمة", emoji: "🌿" },
];

const ElderCategory = () => {
  const { categoryId } = useParams();
  const { tenantId } = useAuth();
  const { items, addItem, updateQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tenantId || !categoryId) return;

    Promise.all([
      supabase.from("categories").select("*").eq("id", categoryId).single(),
      supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("name_ar"),
    ]).then(([catRes, prodRes]) => {
      setCategory(catRes.data);
      setProducts(prodRes.data || []);
      setLoading(false);
    });
  }, [tenantId, categoryId]);

  const getCartItem = (productId: string) => {
    return items.find((i) => i.product_id === productId);
  };

  const getUnit = (product: any) => {
    return selectedUnits[product.id] || product.unit || "حبة";
  };

  const handleAdd = (product: any) => {
    const unit = getUnit(product);
    addItem({
      product_id: product.id,
      name: product.name_ar,
      emoji: product.emoji,
      price: product.price,
      unit,
    });
    toast.success(`تمت إضافة ${product.name_ar} (${unit})`);
  };

  const handleUnitChange = (productId: string, unit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [productId]: unit }));
    // Update cart item unit if already in cart
    const cartItem = getCartItem(productId);
    if (cartItem) {
      // We update via addItem logic — remove and re-add isn't ideal,
      // so we just track it locally for display
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/elder" className="p-2 rounded-lg bg-muted">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">
          {category?.emoji} {category?.name_ar}
        </h1>
      </div>

      {/* Products - single column for easier interaction */}
      <div className="space-y-3">
        {products.map((product, i) => {
          const cartItem = getCartItem(product.id);
          const qty = cartItem?.quantity || 0;
          const currentUnit = getUnit(product);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-4 relative"
            >
              <div className="flex items-center gap-4">
                {/* Product image/emoji */}
                <div className="flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name_ar} className="w-20 h-20 object-contain rounded-xl" />
                  ) : (
                    <span className="text-[48px] block">{product.emoji || "📦"}</span>
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-base font-bold">{product.name_ar}</p>
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="p-1.5 flex-shrink-0"
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isFavorite(product.id)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </div>
                  {product.price && (
                    <p className="text-sm text-primary font-bold mt-0.5">
                      {product.price} ر.س
                    </p>
                  )}
                </div>
              </div>

              {/* Unit selector chips */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                {UNIT_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    onClick={() => handleUnitChange(product.id, u.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2",
                      currentUnit === u.value
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-muted border-transparent text-muted-foreground"
                    )}
                  >
                    <span>{u.emoji}</span>
                    <span>{u.value}</span>
                  </button>
                ))}
              </div>

              {/* Add / Quantity controls */}
              <div className="mt-3">
                {qty === 0 ? (
                  <Button
                    onClick={() => handleAdd(product)}
                    className="w-full h-14 text-lg rounded-xl gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    أضف {currentUnit}
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 rounded-xl"
                      onClick={() => updateQuantity(product.id, qty - 1)}
                    >
                      <Minus className="h-6 w-6" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold block">{qty}</span>
                      <span className="text-xs text-muted-foreground">{cartItem?.unit || currentUnit}</span>
                    </div>
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-xl"
                      onClick={() => updateQuantity(product.id, qty + 1)}
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {products.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-lg">لا توجد منتجات في هذا القسم</p>
      )}
    </div>
  );
};

export default ElderCategory;
