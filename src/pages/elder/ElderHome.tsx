import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Mic, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import VoiceSearch from "@/components/elder/VoiceSearch";

const ElderHome = () => {
  const { tenantId } = useAuth();
  const { items } = useCart();
  const { favorites } = useFavorites();
  const [categories, setCategories] = useState<any[]>([]);
  const [favProducts, setFavProducts] = useState<any[]>([]);
  const [showVoice, setShowVoice] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories(data || []));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || favorites.length === 0) return;
    supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", favorites.slice(0, 10))
      .then(({ data }) => setFavProducts(data || []));
  }, [tenantId, favorites]);

  return (
    <div className="p-4 space-y-6">
      {/* Voice Button - hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <p className="text-lg text-muted-foreground mb-4">اضغط وتكلّم لطلب مشترياتك</p>
        <button
          onClick={() => setShowVoice(true)}
          className="relative w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-lg hover:shadow-xl transition-shadow"
        >
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          <Mic className="h-10 w-10 relative z-10" />
        </button>
        <p className="text-sm text-muted-foreground mt-3">🎤 اطلب بصوتك</p>
      </motion.div>

      {/* Favorites row */}
      {favProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">❤️ المفضلة</h2>
            <Link to="/elder/favorites" className="text-sm text-primary font-medium">
              عرض الكل
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {favProducts.map((p) => (
              <ProductQuickCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div>
        <h2 className="text-lg font-bold mb-3">📂 الأقسام</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/elder/category/${cat.id}`}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center gap-2 min-h-[100px] justify-center hover:border-primary/30 transition-colors"
              >
                <span className="text-[40px]">{cat.emoji}</span>
                <span className="text-base font-bold text-center">{cat.name_ar}</span>
              </motion.div>
            </Link>
          ))}
        </div>
        {categories.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد أقسام — اطلب من المدير إضافتها</p>
        )}
      </div>

      {/* Floating Cart Button */}
      {items.length > 0 && (
        <Link to="/elder/cart">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-[84px] left-4 right-4 max-w-lg mx-auto bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl z-20"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              <span className="font-bold text-lg">{items.length} منتج</span>
            </div>
            <span className="font-bold text-lg">عرض السلة ←</span>
          </motion.div>
        </Link>
      )}

      {/* Voice Search Modal */}
      {showVoice && <VoiceSearch onClose={() => setShowVoice(false)} />}
    </div>
  );
};

const ProductQuickCard = ({ product }: { product: any }) => {
  const { addItem } = useCart();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() =>
        addItem({
          product_id: product.id,
          name: product.name_ar,
          emoji: product.emoji,
          price: product.price,
          unit: product.unit,
        })
      }
      className="flex-shrink-0 w-28 bg-card border border-border rounded-xl p-3 text-center space-y-1"
    >
      <span className="text-3xl block">{product.emoji || "📦"}</span>
      <p className="text-xs font-medium truncate">{product.name_ar}</p>
      {product.price && (
        <p className="text-xs text-primary font-bold">{product.price} ر.س</p>
      )}
    </motion.button>
  );
};

export default ElderHome;
