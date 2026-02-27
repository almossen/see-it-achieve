import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Plus, Check, ChevronDown, ChevronUp, Package, Loader2 } from "lucide-react";


interface RefCategory {
  id: string;
  name_ar: string;
  name_en: string | null;
  emoji: string;
  sort_order: number;
}

interface RefProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  emoji: string | null;
  unit: string;
  image_url: string | null;
  category_id: string | null;
  sort_order: number;
}

const CatalogPage = () => {
  const { tenantId } = useAuth();
  const [refCategories, setRefCategories] = useState<RefCategory[]>([]);
  const [refProducts, setRefProducts] = useState<RefProduct[]>([]);
  const [existingCategoryNames, setExistingCategoryNames] = useState<Set<string>>(new Set());
  const [existingProductNames, setExistingProductNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [importingProducts, setImportingProducts] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!tenantId) return;

    const [refCatRes, refProdRes, existCatRes, existProdRes] = await Promise.all([
      supabase.from("reference_categories").select("*").order("sort_order"),
      supabase.from("reference_products").select("*").order("sort_order"),
      supabase.from("categories").select("name_ar").eq("tenant_id", tenantId),
      supabase.from("products").select("name_ar").eq("tenant_id", tenantId),
    ]);

    setRefCategories((refCatRes.data as RefCategory[]) || []);
    setRefProducts((refProdRes.data as RefProduct[]) || []);
    setExistingCategoryNames(new Set((existCatRes.data || []).map((c: any) => c.name_ar)));
    setExistingProductNames(new Set((existProdRes.data || []).map((p: any) => p.name_ar)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const importCategory = async (cat: RefCategory) => {
    if (!tenantId || existingCategoryNames.has(cat.name_ar)) return;
    setImporting(prev => new Set(prev).add(cat.id));

    const { error } = await supabase.from("categories").insert({
      name_ar: cat.name_ar,
      name_en: cat.name_en,
      emoji: cat.emoji,
      tenant_id: tenantId,
      sort_order: existingCategoryNames.size,
    });

    if (error) {
      toast.error("خطأ في إضافة الفئة", { description: error.message });
    } else {
      toast.success(`تمت إضافة فئة "${cat.name_ar}"`);
      setExistingCategoryNames(prev => new Set(prev).add(cat.name_ar));
    }

    setImporting(prev => { const n = new Set(prev); n.delete(cat.id); return n; });
  };

  const importCategoryWithProducts = async (cat: RefCategory) => {
    if (!tenantId) return;
    setImporting(prev => new Set(prev).add(cat.id));

    // Insert category if not exists
    let categoryId: string | null = null;
    if (!existingCategoryNames.has(cat.name_ar)) {
      const { data, error } = await supabase.from("categories").insert({
        name_ar: cat.name_ar,
        name_en: cat.name_en,
        emoji: cat.emoji,
        tenant_id: tenantId,
        sort_order: existingCategoryNames.size,
      }).select("id").single();

      if (error) {
        toast.error("خطأ في إضافة الفئة", { description: error.message });
        setImporting(prev => { const n = new Set(prev); n.delete(cat.id); return n; });
        return;
      }
      categoryId = data.id;
      setExistingCategoryNames(prev => new Set(prev).add(cat.name_ar));
    } else {
      // Get existing category id
      const { data } = await supabase.from("categories")
        .select("id").eq("tenant_id", tenantId).eq("name_ar", cat.name_ar).single();
      categoryId = data?.id || null;
    }

    // Insert products that don't exist yet
    const catProducts = refProducts.filter(p => p.category_id === cat.id);
    const newProducts = catProducts.filter(p => !existingProductNames.has(p.name_ar));

    if (newProducts.length > 0 && categoryId) {
      const rows = newProducts.map((p, i) => ({
        name_ar: p.name_ar,
        name_en: p.name_en,
        emoji: p.emoji,
        unit: p.unit,
        image_url: p.image_url,
        category_id: categoryId,
        tenant_id: tenantId,
        sort_order: i,
      }));

      const { error } = await supabase.from("products").insert(rows);
      if (error) {
        toast.error("خطأ في إضافة المنتجات", { description: error.message });
      } else {
        toast.success(`تمت إضافة ${newProducts.length} منتج من "${cat.name_ar}"`);
        setExistingProductNames(prev => {
          const next = new Set(prev);
          newProducts.forEach(p => next.add(p.name_ar));
          return next;
        });
      }
    } else if (newProducts.length === 0) {
      toast.info("جميع منتجات هذه الفئة مضافة مسبقاً");
    }

    setImporting(prev => { const n = new Set(prev); n.delete(cat.id); return n; });
  };

  const importProduct = async (product: RefProduct, refCatId: string) => {
    if (!tenantId || existingProductNames.has(product.name_ar)) return;
    setImportingProducts(prev => new Set(prev).add(product.id));

    // Find or create the category
    const refCat = refCategories.find(c => c.id === refCatId);
    let categoryId: string | null = null;

    if (refCat) {
      if (existingCategoryNames.has(refCat.name_ar)) {
        const { data } = await supabase.from("categories")
          .select("id").eq("tenant_id", tenantId).eq("name_ar", refCat.name_ar).single();
        categoryId = data?.id || null;
      } else {
        const { data, error } = await supabase.from("categories").insert({
          name_ar: refCat.name_ar,
          name_en: refCat.name_en,
          emoji: refCat.emoji,
          tenant_id: tenantId,
          sort_order: existingCategoryNames.size,
        }).select("id").single();

        if (!error && data) {
          categoryId = data.id;
          setExistingCategoryNames(prev => new Set(prev).add(refCat.name_ar));
        }
      }
    }

    const { error } = await supabase.from("products").insert({
      name_ar: product.name_ar,
      name_en: product.name_en,
      emoji: product.emoji,
      unit: product.unit,
      image_url: product.image_url,
      category_id: categoryId,
      tenant_id: tenantId,
      sort_order: 0,
    });

    if (error) {
      toast.error("خطأ في إضافة المنتج", { description: error.message });
    } else {
      toast.success(`تمت إضافة "${product.name_ar}"`);
      setExistingProductNames(prev => new Set(prev).add(product.name_ar));
    }

    setImportingProducts(prev => { const n = new Set(prev); n.delete(product.id); return n; });
  };

  const filteredCategories = refCategories.filter(cat => {
    if (!search) return true;
    const catMatch = cat.name_ar.includes(search) || cat.name_en?.toLowerCase().includes(search.toLowerCase());
    const productsMatch = refProducts.some(p =>
      p.category_id === cat.id && (p.name_ar.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()))
    );
    return catMatch || productsMatch;
  });

  const getFilteredProducts = (catId: string) => {
    const products = refProducts.filter(p => p.category_id === catId);
    if (!search) return products;
    return products.filter(p =>
      p.name_ar.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">الكتالوج المرجعي</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الكتالوج المرجعي</h1>
        <p className="text-sm text-muted-foreground mt-1">
          اختر الفئات والمنتجات اللي تبي تضيفها لمتجرك
        </p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن فئة أو منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <div className="space-y-3">
        {filteredCategories.map(cat => {
          const isExpanded = expandedCategories.has(cat.id);
          const catProducts = getFilteredProducts(cat.id);
          const catExists = existingCategoryNames.has(cat.name_ar);
          const allProductsExist = catProducts.every(p => existingProductNames.has(p.name_ar));
          const isImporting = importing.has(cat.id);

          return (
            <Card key={cat.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Category header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-3 flex-1 text-right"
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{cat.name_ar}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.name_en} · {catProducts.length} منتج
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  <div className="flex gap-2 flex-shrink-0">
                    {catExists && allProductsExist ? (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium px-2">
                        <Check className="h-3.5 w-3.5" /> مضافة
                      </span>
                    ) : (
                      <>
                        {!catExists && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => importCategory(cat)}
                            disabled={isImporting}
                          >
                            {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            الفئة فقط
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => importCategoryWithProducts(cat)}
                          disabled={isImporting}
                        >
                          {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                          الكل
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Products list */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 divide-y divide-border">
                    {catProducts.map(product => {
                      const exists = existingProductNames.has(product.name_ar);
                      const isProductImporting = importingProducts.has(product.id);

                      return (
                        <div key={product.id} className="flex items-center gap-3 px-4 py-2.5 pr-12">
                          <span className="text-lg">{product.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{product.name_ar}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.name_en} · {product.unit}
                            </p>
                          </div>
                          {exists ? (
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => importProduct(product, cat.id)}
                              disabled={isProductImporting}
                            >
                              {isProductImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {catProducts.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4">لا توجد منتجات</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredCategories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد نتائج للبحث</p>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
