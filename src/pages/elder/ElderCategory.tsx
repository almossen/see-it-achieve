import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ProductQuantityDrawer from "@/components/elder/ProductQuantityDrawer";

const ElderCategory = () => {
  const { categoryId } = useParams();
  const { tenantId } = useAuth();
  const { items, addItem, updateQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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

  const getCartItem = (productId: string) =>
    items.find((i) => i.product_id === productId);

  const handleAdd = (product: any, unit: string, qty: number) => {
    for (let i = 0; i < qty; i++) {
      addItem({
        product_id: product.id,
        name: product.name_ar,
        emoji: product.emoji,
        price: product.price,
        unit,
      });
    }
    toast.success(`تمت إضافة ${qty} ${unit} ${product.name_ar}`);
  };

  const handleUpdateQty = (product: any, newQty: number) => {
    updateQuantity(product.id, newQty);
    toast.success(`تم تحديث ${product.name_ar} إلى ${newQty}`);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/elder" className="p-2 rounded-lg bg-muted">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">
          {category?.emoji} {category?.name_ar}
        </h1>
      </div>

      {/* Products - clean simple list */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, i) => {
          const cartItem = getCartItem(product.id);
          const qty = cartItem?.quantity || 0;

          return (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedProduct(product)}
              className="relative bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform text-center aspect-square justify-center"
            >
              {/* Quantity badge */}
              {qty > 0 && (
                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                  {qty}
                </span>
              )}

              {/* Favorite */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className="absolute top-2 right-2 p-1"
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

              {/* Product image/emoji */}
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name_ar}
                  className="w-20 h-20 object-contain rounded-xl"
                />
              ) : (
                <span className="text-[48px] block">
                  {product.emoji || "📦"}
                </span>
              )}

              {/* Name & price */}
              <p className="text-base font-bold truncate w-full">{product.name_ar}</p>
              {product.price && (
                <p className="text-sm text-primary font-bold">
                  {product.price} ر.س
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      {products.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-lg">
          لا توجد منتجات في هذا القسم
        </p>
      )}

      {/* Quantity/Unit Drawer */}
      <ProductQuantityDrawer
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        currentQty={
          selectedProduct ? getCartItem(selectedProduct.id)?.quantity || 0 : 0
        }
        currentUnit={
          selectedProduct
            ? getCartItem(selectedProduct.id)?.unit ||
              selectedProduct?.unit ||
              "حبة"
            : "حبة"
        }
        onAdd={(unit, qty) =>
          selectedProduct && handleAdd(selectedProduct, unit, qty)
        }
        onUpdateQty={(qty) =>
          selectedProduct && handleUpdateQty(selectedProduct, qty)
        }
      />
    </div>
  );
};

export default ElderCategory;
