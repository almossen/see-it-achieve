import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const MemberHome = () => {
  const { tenantId } = useAuth();
  const { items, addItem, removeItem } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const getItemQuantity = (productId: string) => items.find(i => i.product_id === productId)?.quantity || 0;

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
        supabase.from("products").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  const filteredProducts = products.filter((p) => {
    const matchCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchSearch = !search || p.name_ar.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ابحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-10" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          الكل
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {cat.emoji} {cat.name_ar}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map((product) => {
          const qty = getItemQuantity(product.id);
          return (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="text-3xl text-center py-2">{product.emoji || "📦"}</div>
                <p className="font-medium text-sm text-center truncate">{product.name_ar}</p>
                {product.price && (
                  <p className="text-xs text-muted-foreground text-center">
                    {product.price} ر.س / {product.unit}
                  </p>
                )}
                {qty === 0 ? (
                  <Button
                    size="sm"
                    className="w-full gap-1 h-8 text-xs"
                    onClick={() => {
                      addItem({ product_id: product.id, name: product.name_ar, price: product.price, emoji: product.emoji, unit: product.unit });
                      toast.success("تمت الإضافة للسلة");
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => removeItem(product.id)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-bold text-sm w-6 text-center">{qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => addItem({ product_id: product.id, name: product.name_ar, price: product.price, emoji: product.emoji, unit: product.unit })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">لا توجد منتجات</p>
      )}
    </div>
  );
};

export default MemberHome;
