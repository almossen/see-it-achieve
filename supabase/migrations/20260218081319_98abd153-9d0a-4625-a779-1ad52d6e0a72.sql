
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'elder', 'member', 'driver');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'assigned', 'processing', 'completed', 'cancelled');

-- Tenants (families)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  theme_color TEXT DEFAULT '#16a34a',
  logo_url TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  emoji TEXT DEFAULT '🛒',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  emoji TEXT,
  image_url TEXT,
  price DECIMAL(10,2),
  unit TEXT DEFAULT 'حبة',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  driver_id UUID REFERENCES public.drivers(id),
  status order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  substitute_image_url TEXT,
  substitute_approved BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper function: check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: check if user is admin of their tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + tenant on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Check if tenant_id was passed in metadata (for invited users)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  ELSE
    -- Create new tenant for first-time signup
    INSERT INTO public.tenants (name) VALUES (_full_name || ' Family') RETURNING id INTO _tenant_id;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, full_name, phone)
  VALUES (NEW.id, _tenant_id, _full_name, NEW.raw_user_meta_data->>'phone');

  -- Assign role (default admin for tenant creator, or role from metadata)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'admin'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Tenants: users see their own tenant
CREATE POLICY "Users can view their tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Profiles: users see profiles in their tenant
CREATE POLICY "Users can view tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- User roles: viewable within tenant
CREATE POLICY "Users can view tenant roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Categories: tenant-scoped
CREATE POLICY "Users can view tenant categories" ON public.categories
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Products: tenant-scoped
CREATE POLICY "Users can view tenant products" ON public.products
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Drivers: tenant-scoped
CREATE POLICY "Users can view tenant drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

CREATE POLICY "Drivers can update own availability" ON public.drivers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Orders: tenant-scoped
CREATE POLICY "Users can view tenant orders" ON public.orders
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Members can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND (public.is_tenant_admin() OR created_by = auth.uid()));

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Order items
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id = public.get_user_tenant_id()));

CREATE POLICY "Users can insert order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE tenant_id = public.get_user_tenant_id()));

CREATE POLICY "Users can update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id = public.get_user_tenant_id()));

CREATE POLICY "Admins can delete order items" ON public.order_items
  FOR DELETE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id = public.get_user_tenant_id()) AND public.is_tenant_admin());

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin());

-- Enable realtime for orders and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
