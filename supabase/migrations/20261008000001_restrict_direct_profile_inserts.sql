-- Profile creation is handled by ensure_user_profile() and the completion RPCs.
REVOKE INSERT ON public.user_profiles FROM authenticated;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
