-- Validate all tricentric practice fields before awarding XP.

CREATE OR REPLACE FUNCTION public.complete_tricentric_practice(
  p_head text DEFAULT '',
  p_heart text DEFAULT '',
  p_body text DEFAULT '',
  p_synthesis text DEFAULT ''
)
RETURNS TABLE (practice_id uuid, xp_awarded integer, achievement_unlocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_practice_id uuid;
  v_achievement_id uuid;
  v_unlocked boolean := false;
  v_inserted integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF length(trim(coalesce(p_head, ''))) < 1
     OR length(trim(coalesce(p_heart, ''))) < 1
     OR length(trim(coalesce(p_body, ''))) < 1
     OR length(trim(coalesce(p_synthesis, ''))) < 1 THEN
    RAISE EXCEPTION 'Practice requires all four reflections';
  END IF;

  IF length(coalesce(p_head, '')) > 3000
     OR length(coalesce(p_heart, '')) > 3000
     OR length(coalesce(p_body, '')) > 3000
     OR length(coalesce(p_synthesis, '')) > 5000 THEN
    RAISE EXCEPTION 'Practice input exceeds allowed size';
  END IF;

  INSERT INTO public.user_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tricentric_practices (
    user_id, head_text, heart_text, body_text, synthesis_text, xp_earned
  )
  VALUES (
    v_user_id,
    trim(coalesce(p_head, '')),
    trim(coalesce(p_heart, '')),
    trim(coalesce(p_body, '')),
    trim(coalesce(p_synthesis, '')),
    50
  )
  ON CONFLICT (user_id, ((completed_at AT TIME ZONE 'UTC')::date)) DO NOTHING
  RETURNING id INTO v_practice_id;

  IF v_practice_id IS NULL THEN
    RAISE EXCEPTION 'Daily tricentric practice already completed' USING ERRCODE = '23505';
  END IF;

  UPDATE public.user_profiles
  SET experience_points = coalesce(experience_points, 0) + 50,
      current_level = CASE
        WHEN coalesce(experience_points, 0) + 50 >= 5000 THEN 10
        WHEN coalesce(experience_points, 0) + 50 >= 3750 THEN 9
        WHEN coalesce(experience_points, 0) + 50 >= 2700 THEN 8
        WHEN coalesce(experience_points, 0) + 50 >= 1900 THEN 7
        WHEN coalesce(experience_points, 0) + 50 >= 1300 THEN 6
        WHEN coalesce(experience_points, 0) + 50 >= 850 THEN 5
        WHEN coalesce(experience_points, 0) + 50 >= 500 THEN 4
        WHEN coalesce(experience_points, 0) + 50 >= 250 THEN 3
        WHEN coalesce(experience_points, 0) + 50 >= 100 THEN 2
        ELSE 1
      END,
      updated_at = now()
  WHERE id = v_user_id;

  SELECT id INTO v_achievement_id
  FROM public.achievements
  WHERE key = 'tricentric_earthquake';

  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_unlocked := v_inserted = 1;
    IF v_unlocked THEN
      UPDATE public.user_profiles
      SET experience_points = experience_points + 150,
          current_level = CASE
            WHEN experience_points + 150 >= 5000 THEN 10
            WHEN experience_points + 150 >= 3750 THEN 9
            WHEN experience_points + 150 >= 2700 THEN 8
            WHEN experience_points + 150 >= 1900 THEN 7
            WHEN experience_points + 150 >= 1300 THEN 6
            WHEN experience_points + 150 >= 850 THEN 5
            WHEN experience_points + 150 >= 500 THEN 4
            WHEN experience_points + 150 >= 250 THEN 3
            WHEN experience_points + 150 >= 100 THEN 2
            ELSE 1
          END,
          updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN QUERY SELECT v_practice_id, 50 + CASE WHEN v_unlocked THEN 150 ELSE 0 END, v_unlocked;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tricentric_practice(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_tricentric_practice(text, text, text, text) TO authenticated, service_role;
