-- Guardar se realiza mediante complete_tricentric_practice (SECURITY DEFINER);
-- no se concede escritura directa a usuarios autenticados.
ALTER TABLE public.tricentric_practices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own tricentric practices" ON public.tricentric_practices;
REVOKE INSERT, UPDATE, DELETE ON public.tricentric_practices FROM anon, authenticated;
GRANT SELECT ON public.tricentric_practices TO authenticated;
