
-- Add unit_options column to categories table (array of text)
ALTER TABLE public.categories 
ADD COLUMN unit_options text[] DEFAULT ARRAY['حبة', 'كرتون', 'كيلو']::text[];

-- Set specific unit options per category type
-- Vegetables & Fruits: حبة، كرتون، صحن، كيلو
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'صحن', 'كيلو'] 
WHERE name_ar IN ('خضروات', 'فواكه');

-- Dairy: حبة، كرتون، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'علبة'] 
WHERE name_ar IN ('ألبان وأجبان');

-- Meat/Poultry: حبة، كيلو، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كيلو', 'علبة'] 
WHERE name_ar IN ('دواجن ولحوم');

-- Dry goods: كيس، حبة، كرتون
UPDATE public.categories SET unit_options = ARRAY['كيس', 'حبة', 'كرتون'] 
WHERE name_ar IN ('أرز وحبوب ومعكرونة');

-- Canned goods: حبة، كرتون، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'علبة'] 
WHERE name_ar IN ('معلبات');

-- Oils & sauces: حبة، كرتون، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'علبة'] 
WHERE name_ar IN ('زيوت وصلصات');

-- Cleaning: حبة، كرتون، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'علبة'] 
WHERE name_ar IN ('منظفات');

-- Cooking additives: حبة، كيس، علبة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كيس', 'علبة'] 
WHERE name_ar IN ('إضافات طبخ');

-- Tissues: حبة، كرتون، ربطة
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون', 'ربطة'] 
WHERE name_ar IN ('مناديل');

-- Bags & foil: حبة، كرتون
UPDATE public.categories SET unit_options = ARRAY['حبة', 'كرتون'] 
WHERE name_ar IN ('أكياس', 'قصدير ولفائف');
