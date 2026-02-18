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
import UnitPicker from "@/components/elder/UnitPicker";

const ElderCategory = () => {
  const { categoryId } = useParams();
  const { tenantId } = useAuth();
  const { items, addItem, updateQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unitPickerProduct, setUnitPickerProduct] = useState<any>(null);

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

  const getCartQuantity = (productId: string) => {
    return items.find((i) => i.product_id === productId)?.quantity || 0;
  };

  const handleAddWithUnit = (product: any) => {
    setUnitPickerProduct(product);
  };

  const handleUnitSelected = (unit: string) => {
    if (!unitPickerProduct) return;
    addItem({
      product_id: unitPickerProduct.id,
      name: unitPickerProduct.name_ar,
      emoji: unitPickerProduct.emoji,
      price: unitPickerProduct.price,
      unit,
    });
    toast.success(`تمت إضافة ${unitPickerProduct.name_ar} (${unit})`);
    setUnitPickerProduct(null);
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

      {/* Products 2-col grid */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, i) => {
          const qty = getCartQuantity(product.id);
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center relative"
            >
              {/* Favorite button */}
              <button
                onClick={() => toggleFavorite(product.id)}
                className="absolute top-2 left-2 p-1.5"
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

              {product.image_url ? (
                <img src={product.image_url} alt={product.name_ar} className="w-20 h-20 object-contain rounded-xl mb-2" />
              ) : (
                <span className="text-[48px] mb-2">{product.emoji || "📦"}</span>
              )}
              <p className="text-sm font-bold text-center mb-1">{product.name_ar}</p>
              {product.price && (
                <p className="text-xs text-primary font-bold mb-3">
                  {product.price} ر.س / {product.unit}
                </p>
              )}

              {/* Add/Quantity controls */}
              {qty === 0 ? (
                <Button
                  onClick={() => handleAddWithUnit(product)}
                  size="sm"
                  className="w-full h-11 text-base rounded-xl gap-1"
                >
                  <Plus className="h-5 w-5" />
                  أضف
                </Button>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl"
                    onClick={() => updateQuantity(product.id, qty - 1)}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="flex-1 text-center text-lg font-bold">{qty}</span>
                  <Button
                    size="icon"
                    className="h-11 w-11 rounded-xl"
                    onClick={() => updateQuantity(product.id, qty + 1)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {products.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-lg">لا توجد منتجات في هذا القسم</p>
      )}

      {unitPickerProduct && (
        <UnitPicker
          productName={unitPickerProduct.name_ar}
          onSelect={handleUnitSelected}
          onClose={() => setUnitPickerProduct(null)}
        />
      )}
    </div>
  );
};

export default ElderCategory;
