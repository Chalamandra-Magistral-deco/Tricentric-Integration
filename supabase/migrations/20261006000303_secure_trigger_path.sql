ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
