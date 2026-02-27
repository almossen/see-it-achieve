
-- Reference categories (global, not tenant-specific)
CREATE TABLE public.reference_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  emoji text DEFAULT '🛒',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reference products (global, not tenant-specific)
CREATE TABLE public.reference_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  emoji text,
  unit text DEFAULT 'حبة',
  image_url text,
  category_id uuid REFERENCES public.reference_categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reference_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_products ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reference data
CREATE POLICY "Authenticated users can view reference categories"
  ON public.reference_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view reference products"
  ON public.reference_products FOR SELECT TO authenticated
  USING (true);
