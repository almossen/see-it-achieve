import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Heart, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ElderFavorites = () => {
  const { tenantId } = useAuth();
  const { favorites } = useFavorites();
  const { addItem } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || favorites.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", favorites)
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, [tenantId, favorites]);

  const handleAdd = (product: any) => {
    addItem({
      product_id: product.id,
      name: product.name_ar,
      emoji: product.emoji,
      price: product.price,
      unit: product.unit,
    });
    toast.success(`تمت إضافة ${product.name_ar}`);
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">❤️ المفضلة</h1>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">❤️ المفضلة</h1>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">لا توجد منتجات مفضلة بعد</p>
          <p className="text-sm text-muted-foreground mt-1">اضغط ❤️ على أي منتج لإضافته هنا</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center"
            >
              {product.image_url ? (
                <img src={product.image_url} alt={product.name_ar} className="w-20 h-20 object-cover rounded-xl mb-2" />
              ) : (
                <span className="text-[48px] mb-2">{product.emoji || "📦"}</span>
              )}
              <p className="text-sm font-bold text-center mb-1">{product.name_ar}</p>
              {product.price && (
                <p className="text-xs text-primary font-bold mb-3">{product.price} ر.س</p>
              )}
              <Button onClick={() => handleAdd(product)} size="sm" className="w-full h-11 text-base rounded-xl gap-1">
                <Plus className="h-5 w-5" />
                أضف للسلة
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ElderFavorites;
