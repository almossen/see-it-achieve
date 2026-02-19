-- Add sort_order column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at order per tenant
UPDATE public.products p
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.products
) sub
WHERE p.id = sub.id;
