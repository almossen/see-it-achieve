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
      <div className="space-y-2">
        {products.map((product, i) => {
          const cartItem = getCartItem(product.id);
          const qty = cartItem?.quantity || 0;

          return (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedProduct(product)}
              className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-right"
            >
              {/* Product emoji/image */}
              <div className="flex-shrink-0">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name_ar}
                    className="w-14 h-14 object-contain rounded-xl"
                  />
                ) : (
                  <span className="text-[40px] block">
                    {product.emoji || "📦"}
                  </span>
                )}
              </div>

              {/* Name & price */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold truncate">{product.name_ar}</p>
                {product.price && (
                  <p className="text-sm text-primary font-bold">
                    {product.price} ر.س
                  </p>
                )}
              </div>

              {/* Quantity badge or favorite */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {qty > 0 && (
                  <span className="bg-primary text-primary-foreground text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center">
                    {qty}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  className="p-2"
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
