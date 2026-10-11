-- Habilitar Row Level Security en la tabla
ALTER TABLE public.tricentric_practices ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si existen
DROP POLICY IF EXISTS "Users can insert their own tricentric practices" ON public.tricentric_practices;
DROP POLICY IF EXISTS "Users can read their own tricentric practices" ON public.tricentric_practices;

-- Política de inserción: El user_id debe coincidir con el usuario autenticado
CREATE POLICY "Users can insert their own tricentric practices"
ON public.tricentric_practices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política de lectura: Cada usuario solo puede ver sus propias prácticas
CREATE POLICY "Users can read their own tricentric practices"
ON public.tricentric_practices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
