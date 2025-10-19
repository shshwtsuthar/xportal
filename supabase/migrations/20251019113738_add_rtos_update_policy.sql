-- Add UPDATE policy for rtos table
CREATE POLICY "rls_rtos_update" ON public.rtos FOR UPDATE USING (id = public.get_my_rto_id()) WITH CHECK (id = public.get_my_rto_id());