
-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🍽️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_items table
CREATE TABLE public.recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- RLS for recipes
CREATE POLICY "Users can view tenant recipes" ON public.recipes FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create recipes" ON public.recipes FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND created_by = auth.uid());
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (created_by = auth.uid());

-- RLS for recipe_items
CREATE POLICY "Users can view recipe items" ON public.recipe_items FOR SELECT USING (recipe_id IN (SELECT id FROM public.recipes WHERE tenant_id = get_user_tenant_id()));
CREATE POLICY "Users can insert recipe items" ON public.recipe_items FOR INSERT WITH CHECK (recipe_id IN (SELECT id FROM public.recipes WHERE tenant_id = get_user_tenant_id()));
CREATE POLICY "Users can update recipe items" ON public.recipe_items FOR UPDATE USING (recipe_id IN (SELECT id FROM public.recipes WHERE created_by = auth.uid()));
CREATE POLICY "Users can delete recipe items" ON public.recipe_items FOR DELETE USING (recipe_id IN (SELECT id FROM public.recipes WHERE created_by = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
