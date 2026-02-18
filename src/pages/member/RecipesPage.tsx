import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const RecipesPage = () => {
  const { user, tenantId } = useAuth();
  const { addItem } = useCart();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [newRecipe, setNewRecipe] = useState({ name: "", emoji: "🍽️", description: "" });
  const [recipeItems, setRecipeItems] = useState<{ product_id: string; product_name: string; quantity: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;
    const [recipesRes, productsRes] = await Promise.all([
      supabase.from("recipes").select("*, recipe_items(*)").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("tenant_id", tenantId).eq("is_active", true),
    ]);
    setRecipes(recipesRes.data || []);
    setProducts(productsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId || recipeItems.length === 0) {
      toast.error("أضف منتج واحد على الأقل");
      return;
    }
    setSubmitting(true);

    const { data: recipe, error } = await supabase.from("recipes").insert({
      name: newRecipe.name,
      emoji: newRecipe.emoji,
      description: newRecipe.description,
      tenant_id: tenantId,
      created_by: user.id,
    }).select().single();

    if (error) {
      toast.error("خطأ في إنشاء الوصفة");
      setSubmitting(false);
      return;
    }

    await supabase.from("recipe_items").insert(
      recipeItems.map((item) => ({ recipe_id: recipe.id, product_id: item.product_id, product_name: item.product_name, quantity: item.quantity }))
    );

    toast.success("تم إنشاء الوصفة بنجاح");
    setDialogOpen(false);
    setNewRecipe({ name: "", emoji: "🍽️", description: "" });
    setRecipeItems([]);
    setSubmitting(false);
    fetchData();
  };

  const handleDeleteRecipe = async (id: string) => {
    await supabase.from("recipes").delete().eq("id", id);
    toast.success("تم حذف الوصفة");
    fetchData();
  };

  const addRecipeToCart = (recipe: any) => {
    recipe.recipe_items?.forEach((item: any) => {
      const product = products.find((p) => p.id === item.product_id);
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          product_id: item.product_id || item.id,
          name: item.product_name,
          price: product?.price,
          emoji: product?.emoji,
          unit: product?.unit,
        });
      }
    });
    toast.success("تمت إضافة مكونات الوصفة للسلة");
  };

  const addProductToRecipe = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = recipeItems.find((i) => i.product_id === productId);
    if (existing) {
      setRecipeItems(recipeItems.map((i) => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setRecipeItems([...recipeItems, { product_id: productId, product_name: product.name_ar, quantity: 1 }]);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center"><h1 className="text-xl font-bold">الوصفات</h1></div>
        {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الوصفات</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              وصفة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء وصفة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddRecipe} className="space-y-4">
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <Label>اسم الوصفة</Label>
                  <Input value={newRecipe.name} onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })} required placeholder="كبسة دجاج" />
                </div>
                <div className="space-y-1 w-20">
                  <Label>رمز</Label>
                  <Input value={newRecipe.emoji} onChange={(e) => setNewRecipe({ ...newRecipe, emoji: e.target.value })} className="text-center text-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>وصف (اختياري)</Label>
                <Input value={newRecipe.description} onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })} placeholder="وصفة عائلية مميزة" />
              </div>
              <div className="space-y-2">
                <Label>المكونات</Label>
                <Select onValueChange={addProductToRecipe}>
                  <SelectTrigger><SelectValue placeholder="اختر منتج لإضافته" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipeItems.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {recipeItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
                        <span>{item.product_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">×{item.quantity}</span>
                          <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الإنشاء..." : "إنشاء الوصفة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">لا توجد وصفات بعد</p>
          <p className="text-sm text-muted-foreground mt-1">أنشئ وصفتك الأولى لتسهيل الطلبات المتكررة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
                    <span className="text-2xl">{recipe.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">{recipe.recipe_items?.length || 0} مكون</p>
                    </div>
                    {expandedRecipe === recipe.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => addRecipeToCart(recipe)}>
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRecipe(recipe.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {expandedRecipe === recipe.id && recipe.recipe_items?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    {recipe.recipe_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product_name}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                      </div>
                    ))}
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

export default RecipesPage;
