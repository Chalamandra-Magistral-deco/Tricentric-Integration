-- SRAP production hardening: authoritative evaluation/practice writes,
-- least-privilege API access, replay protection, and AI quota enforcement.

-- Remove legacy RPCs that allowed client-controlled XP mutations.
DROP FUNCTION IF EXISTS public.increment_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.tricentric_earthquake(uuid);

-- The browser may read its own state, but all business-critical writes go through RPCs.
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own evaluations" ON public.evaluations;

REVOKE INSERT ON public.evaluations FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.evaluations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_achievements FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT INSERT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.evaluations TO authenticated;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;

-- One evaluation per UTC calendar day. This is the database-level replay guard.
CREATE UNIQUE INDEX IF NOT EXISTS uq_evaluations_user_utc_day
  ON public.evaluations (user_id, ((completed_at AT TIME ZONE 'UTC')::date));

-- Persisted tricentric reflections. One completed practice per UTC day.
CREATE TABLE IF NOT EXISTS public.tricentric_practices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  head_text text NOT NULL DEFAULT '',
  heart_text text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  synthesis_text text NOT NULL DEFAULT '',
  xp_earned integer NOT NULL DEFAULT 50 CHECK (xp_earned >= 0),
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tricentric_practices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tricentric practices" ON public.tricentric_practices;
CREATE POLICY "Users can view own tricentric practices"
  ON public.tricentric_practices
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tricentric_practices_user_utc_day
  ON public.tricentric_practices (user_id, ((completed_at AT TIME ZONE 'UTC')::date));

REVOKE ALL ON public.tricentric_practices FROM anon, authenticated;
GRANT SELECT ON public.tricentric_practices TO authenticated;
GRANT ALL ON public.tricentric_practices TO service_role;

-- Daily AI quota. The table is server-managed and never exposed to browser roles.
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_daily FROM anon, authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid AI quota limit';
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, usage_date, request_count)
  VALUES (p_user_id, v_today, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  UPDATE public.ai_usage_daily
  SET request_count = request_count + 1
  WHERE user_id = p_user_id
    AND usage_date = v_today
    AND request_count < p_limit;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, integer) TO service_role;

-- Safe profile bootstrap for the authenticated browser.
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT *
  INTO v_profile
  FROM public.user_profiles
  WHERE id = v_user_id;

  RETURN v_profile;
END;
$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated, service_role;

-- Single authoritative evaluation transaction.
CREATE OR REPLACE FUNCTION public.complete_evaluation(
  p_bleeding_center text,
  p_sacrifice_center text,
  p_oxygen_actions text[] DEFAULT '{}',
  p_synthesis_text text DEFAULT '',
  p_ai_analysis text DEFAULT '',
  p_ai_synthesis_feedback text DEFAULT NULL
)
RETURNS TABLE (
  evaluation_id uuid,
  xp_earned integer,
  achievement_xp integer,
  experience_points integer,
  current_level integer,
  streak_days integer,
  total_evaluations integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_yesterday date := v_today - 1;
  v_streak integer;
  v_honest boolean;
  v_eval_xp integer;
  v_total_xp integer;
  v_level integer;
  v_achievement_xp integer := 0;
  v_evaluation_id uuid;
  v_achievement record;
  v_inserted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_bleeding_center NOT IN ('head', 'heart', 'body')
     OR p_sacrifice_center NOT IN ('head', 'heart', 'body') THEN
    RAISE EXCEPTION 'Invalid center';
  END IF;

  IF length(trim(coalesce(p_synthesis_text, ''))) < 1
     OR length(p_synthesis_text) > 5000 THEN
    RAISE EXCEPTION 'Synthesis must contain 1-5000 characters';
  END IF;

  IF coalesce(length(p_ai_analysis), 0) > 12000
     OR coalesce(length(p_ai_synthesis_feedback), 0) > 12000 THEN
    RAISE EXCEPTION 'AI response too large';
  END IF;

  IF coalesce(array_length(p_oxygen_actions, 1), 0) > 3 THEN
    RAISE EXCEPTION 'Too many oxygen actions';
  END IF;

  INSERT INTO public.user_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT *
  INTO v_profile
  FROM public.user_profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile.last_evaluation_date = v_today THEN
    RAISE EXCEPTION 'Daily evaluation already completed' USING ERRCODE = '23505';
  END IF;

  v_streak := CASE
    WHEN v_profile.last_evaluation_date = v_yesterday
      THEN coalesce(v_profile.streak_days, 0) + 1
    ELSE 1
  END;

  v_honest := length(trim(p_synthesis_text)) >= 50;
  v_eval_xp := 50 + (v_streak * 10) + CASE WHEN v_honest THEN 50 ELSE 0 END;

  INSERT INTO public.evaluations (
    user_id,
    bleeding_center,
    sacrifice_center,
    oxygen_actions,
    synthesis_text,
    ai_analysis,
    ai_synthesis_feedback,
    xp_earned
  )
  VALUES (
    v_user_id,
    p_bleeding_center,
    p_sacrifice_center,
    coalesce(p_oxygen_actions, '{}'),
    trim(p_synthesis_text),
    coalesce(p_ai_analysis, ''),
    p_ai_synthesis_feedback,
    v_eval_xp
  )
  RETURNING id INTO v_evaluation_id;

  v_total_xp := coalesce(v_profile.experience_points, 0) + v_eval_xp;
  v_level := CASE
    WHEN v_total_xp >= 5000 THEN 10
    WHEN v_total_xp >= 3750 THEN 9
    WHEN v_total_xp >= 2700 THEN 8
    WHEN v_total_xp >= 1900 THEN 7
    WHEN v_total_xp >= 1300 THEN 6
    WHEN v_total_xp >= 850 THEN 5
    WHEN v_total_xp >= 500 THEN 4
    WHEN v_total_xp >= 250 THEN 3
    WHEN v_total_xp >= 100 THEN 2
    ELSE 1
  END;

  -- Achievement rewards are granted only on the first unlock.
  FOR v_achievement IN
    SELECT key, xp_reward
    FROM public.achievements
    WHERE key IN (
      'first_blood',
      'week_warrior',
      'month_survivor',
      'level_5',
      'level_10',
      'ten_evaluations',
      'honest_synthesis'
    )
  LOOP
    IF (v_achievement.key = 'first_blood' AND v_profile.total_evaluations + 1 = 1)
       OR (v_achievement.key = 'week_warrior' AND v_streak >= 7)
       OR (v_achievement.key = 'month_survivor' AND v_streak >= 30)
       OR (v_achievement.key = 'level_5' AND v_level >= 5)
       OR (v_achievement.key = 'level_10' AND v_level >= 10)
       OR (v_achievement.key = 'ten_evaluations' AND v_profile.total_evaluations + 1 >= 10)
       OR (v_achievement.key = 'honest_synthesis' AND v_honest) THEN

      INSERT INTO public.user_achievements (user_id, achievement_id)
      SELECT v_user_id, a.id
      FROM public.achievements a
      WHERE a.key = v_achievement.key
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted = 1 THEN
        v_achievement_xp := v_achievement_xp + coalesce(v_achievement.xp_reward, 0);
      END IF;
    END IF;
  END LOOP;

  v_total_xp := v_total_xp + v_achievement_xp;
  v_level := CASE
    WHEN v_total_xp >= 5000 THEN 10
    WHEN v_total_xp >= 3750 THEN 9
    WHEN v_total_xp >= 2700 THEN 8
    WHEN v_total_xp >= 1900 THEN 7
    WHEN v_total_xp >= 1300 THEN 6
    WHEN v_total_xp >= 850 THEN 5
    WHEN v_total_xp >= 500 THEN 4
    WHEN v_total_xp >= 250 THEN 3
    WHEN v_total_xp >= 100 THEN 2
    ELSE 1
  END;

  UPDATE public.user_profiles
  SET experience_points = v_total_xp,
      current_level = v_level,
      streak_days = v_streak,
      total_evaluations = coalesce(total_evaluations, 0) + 1,
      last_evaluation_date = v_today,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN QUERY
  SELECT
    v_evaluation_id,
    v_eval_xp,
    v_achievement_xp,
    v_total_xp,
    v_level,
    v_streak,
    v_profile.total_evaluations + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_evaluation(text, text, text[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_evaluation(text, text, text[], text, text, text) TO authenticated, service_role;

-- Single authoritative tricentric practice transaction.
CREATE OR REPLACE FUNCTION public.complete_tricentric_practice(
  p_head text DEFAULT '',
  p_heart text DEFAULT '',
  p_body text DEFAULT '',
  p_synthesis text DEFAULT ''
)
RETURNS TABLE (practice_id uuid, xp_awarded integer, achievement_unlocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Ensure the achievement exists even if the original seed migration was not replayed.
INSERT INTO public.achievements (key, title, description, icon, xp_reward)
VALUES (
  'tricentric_earthquake',
  'Tricentric Earthquake',
  'Deep integration of the three centers achieved.',
  '🌋',
  150
)
ON CONFLICT (key) DO NOTHING;

-- Explicit grants for the new table/function API surface.
GRANT ALL ON public.tricentric_practices TO service_role;
