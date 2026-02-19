
-- Table for products suggested by elders via voice that don't exist in catalog
CREATE TABLE public.suggested_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name_ar TEXT NOT NULL,
  unit TEXT,
  suggested_by UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, added, dismissed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggested_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suggested products"
  ON public.suggested_products FOR ALL
  USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Users can insert suggested products"
  ON public.suggested_products FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view suggested products"
  ON public.suggested_products FOR SELECT
  USING (tenant_id = get_user_tenant_id());
