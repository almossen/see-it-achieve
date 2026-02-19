
-- Allow drivers to update orders assigned to them
CREATE POLICY "Drivers can update assigned orders"
ON public.orders
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id()
  AND driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);
