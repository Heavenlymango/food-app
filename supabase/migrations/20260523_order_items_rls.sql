-- Allow students to read order_items that belong to their own orders
CREATE POLICY IF NOT EXISTS "students_read_own_order_items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.student_id = auth.uid()
  )
);

-- Allow service role (Edge Functions) full access — already implicit but make explicit
CREATE POLICY IF NOT EXISTS "service_role_all_order_items"
ON public.order_items
FOR ALL
USING (auth.role() = 'service_role');
