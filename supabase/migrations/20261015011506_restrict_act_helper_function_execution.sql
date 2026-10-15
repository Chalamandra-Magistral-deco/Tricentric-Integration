-- Restrict helper-function execution to trusted database roles.
-- The application calls calculate_act_score through privileged functions.
-- The evaluation trigger is already installed by the existing migrations.

BEGIN;

REVOKE ALL ON FUNCTION public.calculate_act_score(integer, integer, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_act_score(integer, integer, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.trigger_calculate_evaluation_act()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trigger_calculate_evaluation_act()
  TO service_role;

COMMIT;
