-- Add only the practice fields required by the current tricentric save flow.
ALTER TABLE public.tricentric_practices
  ADD COLUMN IF NOT EXISTS context_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_synthesis text,
  ADD COLUMN IF NOT EXISTS ai_feedback text,
  ADD COLUMN IF NOT EXISTS head_intensity integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS heart_intensity integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS body_intensity integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS act_score numeric(5, 2) NOT NULL DEFAULT 100;

UPDATE public.tricentric_practices
SET head_intensity = least(greatest(coalesce(head_intensity, 5), 0), 10),
    heart_intensity = least(greatest(coalesce(heart_intensity, 5), 0), 10),
    body_intensity = least(greatest(coalesce(body_intensity, 5), 0), 10);

ALTER TABLE public.tricentric_practices
  ALTER COLUMN act_score TYPE numeric(5, 2)
    USING least(greatest(coalesce(act_score::numeric, 100), 0), 100)::numeric(5, 2);

CREATE OR REPLACE FUNCTION public.calculate_act_score(
    p_head integer,
    p_heart integer,
    p_body integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $act$
DECLARE
    v_mean numeric;
    v_variance numeric;
    v_max_variance numeric := 200.0 / 9.0;
    v_act numeric;
BEGIN
    p_head := LEAST(GREATEST(p_head, 0), 10);
    p_heart := LEAST(GREATEST(p_heart, 0), 10);
    p_body := LEAST(GREATEST(p_body, 0), 10);

    v_mean := (p_head + p_heart + p_body) / 3.0;

    v_variance := (
        POWER(p_head - v_mean, 2)
        + POWER(p_heart - v_mean, 2)
        + POWER(p_body - v_mean, 2)
    ) / 3.0;

    v_act := 100.0 * (1.0 - SQRT(v_variance / v_max_variance));

    RETURN ROUND(GREATEST(LEAST(v_act, 100.0), 0.0), 2);
END;
$act$;

CREATE OR REPLACE FUNCTION public.trigger_calculate_evaluation_act()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $trigger_act$
BEGIN
    NEW.act_score := public.calculate_act_score(
        NEW.head_intensity,
        NEW.heart_intensity,
        NEW.body_intensity
    );
    RETURN NEW;
END;
$trigger_act$;

-- Recalculate derived scores using the corrected normalization.
UPDATE public.evaluations
SET act_score = public.calculate_act_score(
    head_intensity,
    heart_intensity,
    body_intensity
);

UPDATE public.tricentric_practices
SET act_score = public.calculate_act_score(
  head_intensity,
  heart_intensity,
  body_intensity
);

ALTER TABLE public.tricentric_practices
  ALTER COLUMN head_intensity SET DEFAULT 5,
  ALTER COLUMN heart_intensity SET DEFAULT 5,
  ALTER COLUMN body_intensity SET DEFAULT 5,
  ALTER COLUMN act_score SET DEFAULT 100,
  ALTER COLUMN head_intensity SET NOT NULL,
  ALTER COLUMN heart_intensity SET NOT NULL,
  ALTER COLUMN body_intensity SET NOT NULL,
  ALTER COLUMN act_score SET NOT NULL;

ALTER TABLE public.tricentric_practices
  DROP CONSTRAINT IF EXISTS tricentric_practices_head_intensity_range,
  DROP CONSTRAINT IF EXISTS tricentric_practices_heart_intensity_range,
  DROP CONSTRAINT IF EXISTS tricentric_practices_body_intensity_range,
  DROP CONSTRAINT IF EXISTS tricentric_practices_act_score_range;

ALTER TABLE public.tricentric_practices
  ADD CONSTRAINT tricentric_practices_head_intensity_range CHECK (head_intensity BETWEEN 0 AND 10),
  ADD CONSTRAINT tricentric_practices_heart_intensity_range CHECK (heart_intensity BETWEEN 0 AND 10),
  ADD CONSTRAINT tricentric_practices_body_intensity_range CHECK (body_intensity BETWEEN 0 AND 10),
  ADD CONSTRAINT tricentric_practices_act_score_range CHECK (act_score BETWEEN 0 AND 100);

COMMENT ON COLUMN public.user_profiles.total_evaluations IS
  'Count of successful SRAP evaluations and tricentric practices.';

CREATE OR REPLACE FUNCTION public.calculate_next_streak(
  p_last_activity_date date,
  p_current_streak integer,
  p_activity_date date
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_last_activity_date = p_activity_date THEN coalesce(p_current_streak, 0)
    WHEN p_last_activity_date = p_activity_date - 1 THEN coalesce(p_current_streak, 0) + 1
    ELSE 1
  END
$$;

CREATE OR REPLACE FUNCTION public.calculate_gamification_level(p_experience_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN coalesce(p_experience_points, 0) >= 5000 THEN 10
    WHEN coalesce(p_experience_points, 0) >= 3750 THEN 9
    WHEN coalesce(p_experience_points, 0) >= 2700 THEN 8
    WHEN coalesce(p_experience_points, 0) >= 1900 THEN 7
    WHEN coalesce(p_experience_points, 0) >= 1300 THEN 6
    WHEN coalesce(p_experience_points, 0) >= 850 THEN 5
    WHEN coalesce(p_experience_points, 0) >= 500 THEN 4
    WHEN coalesce(p_experience_points, 0) >= 250 THEN 3
    WHEN coalesce(p_experience_points, 0) >= 100 THEN 2
    ELSE 1
  END
$$;

REVOKE ALL ON FUNCTION public.calculate_next_streak(date, integer, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_next_streak(date, integer, date)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_gamification_level(integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_gamification_level(integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.grant_activity_achievements(
  p_total_activities integer,
  p_streak_days integer,
  p_level integer,
  p_honest_synthesis boolean
)
RETURNS TABLE (xp_awarded integer, achievement_unlocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_achievement record;
  v_inserted integer;
  v_total_xp integer := 0;
  v_unlocked boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

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
    IF (v_achievement.key = 'first_blood' AND p_total_activities = 1)
       OR (v_achievement.key = 'week_warrior' AND p_streak_days >= 7)
       OR (v_achievement.key = 'month_survivor' AND p_streak_days >= 30)
       OR (v_achievement.key = 'level_5' AND p_level >= 5)
       OR (v_achievement.key = 'level_10' AND p_level >= 10)
       OR (v_achievement.key = 'ten_evaluations' AND p_total_activities >= 10)
       OR (v_achievement.key = 'honest_synthesis' AND p_honest_synthesis) THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      SELECT v_user_id, a.id
      FROM public.achievements a
      WHERE a.key = v_achievement.key
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted = 1 THEN
        v_total_xp := v_total_xp + coalesce(v_achievement.xp_reward, 0);
        v_unlocked := true;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_total_xp, v_unlocked;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_activity_achievements(integer, integer, integer, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

-- Keep a tricentric practice and an SRAP evaluation as separate activities,
-- while deriving their daily streak from the same UTC calendar date.
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
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_streak integer;
  v_honest boolean;
  v_eval_xp integer;
  v_total_xp integer;
  v_level integer;
  v_achievement_xp integer := 0;
  v_achievement_unlocked boolean := false;
  v_evaluation_id uuid;
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

  IF EXISTS (
    SELECT 1
    FROM public.evaluations
    WHERE user_id = v_user_id
      AND (completed_at AT TIME ZONE 'UTC')::date = v_today
  ) THEN
    RAISE EXCEPTION 'Daily evaluation already completed' USING ERRCODE = '23505';
  END IF;

  v_streak := public.calculate_next_streak(
    v_profile.last_evaluation_date,
    v_profile.streak_days,
    v_today
  );

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
  v_level := public.calculate_gamification_level(v_total_xp);

  SELECT achievement.xp_awarded, achievement.achievement_unlocked
  INTO v_achievement_xp, v_achievement_unlocked
  FROM public.grant_activity_achievements(
    coalesce(v_profile.total_evaluations, 0) + 1,
    v_streak,
    v_level,
    v_honest
  ) AS achievement;

  v_total_xp := v_total_xp + v_achievement_xp;
  v_level := public.calculate_gamification_level(v_total_xp);

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
    coalesce(v_profile.total_evaluations, 0) + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_evaluation(text, text, text[], text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_evaluation(text, text, text[], text, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_tricentric_practice(
  p_context text,
  p_head text,
  p_heart text,
  p_body text,
  p_synthesis text,
  p_head_intensity integer,
  p_heart_intensity integer,
  p_body_intensity integer,
  p_ai_synthesis text,
  p_ai_feedback text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles%ROWTYPE;
  v_practice_id uuid;
  v_achievement_id uuid;
  v_achievement_xp integer := 0;
  v_achievement_unlocked boolean := false;
  v_xp_awarded integer := 50;
  v_total_xp integer;
  v_level integer;
  v_streak integer;
  v_activity_achievement_xp integer := 0;
  v_activity_achievement_unlocked boolean := false;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_act_score numeric(5, 2);
  v_inserted integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF length(trim(coalesce(p_synthesis, ''))) = 0
     OR (
       length(trim(coalesce(p_head, ''))) = 0
       AND length(trim(coalesce(p_heart, ''))) = 0
       AND length(trim(coalesce(p_body, ''))) = 0
     ) THEN
    RAISE EXCEPTION 'Practice requires one center reflection and a next step';
  END IF;

  IF length(coalesce(p_context, '')) > 3000
     OR length(coalesce(p_head, '')) > 3000
     OR length(coalesce(p_heart, '')) > 3000
     OR length(coalesce(p_body, '')) > 3000
     OR length(coalesce(p_synthesis, '')) > 5000
     OR length(coalesce(p_ai_synthesis, '')) > 5000
     OR length(coalesce(p_ai_feedback, '')) > 3000 THEN
    RAISE EXCEPTION 'Practice input exceeds allowed size';
  END IF;

  IF p_head_intensity IS NULL OR p_head_intensity NOT BETWEEN 0 AND 10
     OR p_heart_intensity IS NULL OR p_heart_intensity NOT BETWEEN 0 AND 10
     OR p_body_intensity IS NULL OR p_body_intensity NOT BETWEEN 0 AND 10 THEN
    RAISE EXCEPTION 'Center intensity must be between 0 and 10';
  END IF;

  v_act_score := public.calculate_act_score(
    p_head_intensity,
    p_heart_intensity,
    p_body_intensity
  );

  INSERT INTO public.user_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT *
  INTO v_profile
  FROM public.user_profiles
  WHERE id = v_user_id
  FOR UPDATE;

  INSERT INTO public.tricentric_practices (
    user_id,
    context_text,
    ai_synthesis,
    ai_feedback,
    head_text,
    heart_text,
    body_text,
    synthesis_text,
    head_intensity,
    heart_intensity,
    body_intensity,
    act_score,
    xp_earned
  )
  VALUES (
    v_user_id,
    trim(p_context),
    nullif(trim(coalesce(p_ai_synthesis, '')), ''),
    nullif(trim(coalesce(p_ai_feedback, '')), ''),
    trim(coalesce(p_head, '')),
    trim(coalesce(p_heart, '')),
    trim(coalesce(p_body, '')),
    trim(p_synthesis),
    p_head_intensity,
    p_heart_intensity,
    p_body_intensity,
    v_act_score,
    50
  )
  ON CONFLICT (user_id, ((completed_at AT TIME ZONE 'UTC')::date)) DO NOTHING
  RETURNING id INTO v_practice_id;

  IF v_practice_id IS NULL THEN
    RAISE EXCEPTION 'Daily tricentric practice already completed' USING ERRCODE = '23505';
  END IF;

  SELECT id INTO v_achievement_id
  FROM public.achievements
  WHERE key = 'tricentric_earthquake';

  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_achievement_unlocked := v_inserted = 1;
    IF v_achievement_unlocked THEN
      SELECT coalesce(xp_reward, 150) INTO v_achievement_xp
      FROM public.achievements
      WHERE id = v_achievement_id;
    END IF;
  END IF;

  v_streak := public.calculate_next_streak(
    v_profile.last_evaluation_date,
    v_profile.streak_days,
    v_today
  );
  v_level := public.calculate_gamification_level(
    coalesce(v_profile.experience_points, 0) + v_xp_awarded
  );
  SELECT achievement.xp_awarded, achievement.achievement_unlocked
  INTO v_activity_achievement_xp, v_activity_achievement_unlocked
  FROM public.grant_activity_achievements(
    coalesce(v_profile.total_evaluations, 0) + 1,
    v_streak,
    v_level,
    length(trim(p_synthesis)) >= 50
  ) AS achievement;

  v_xp_awarded :=
    v_xp_awarded + v_achievement_xp + v_activity_achievement_xp;
  v_achievement_unlocked :=
    v_achievement_unlocked OR v_activity_achievement_unlocked;
  v_total_xp := coalesce(v_profile.experience_points, 0) + v_xp_awarded;
  v_level := public.calculate_gamification_level(v_total_xp);

  UPDATE public.user_profiles
  SET experience_points = v_total_xp,
      current_level = v_level,
      streak_days = v_streak,
      total_evaluations = coalesce(total_evaluations, 0) + 1,
      last_evaluation_date = v_today,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'practice_id', v_practice_id,
    'xp_awarded', v_xp_awarded,
    'achievement_unlocked', v_achievement_unlocked,
    'act_score', v_act_score
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tricentric_practice(
  text, text, text, text, text, integer, integer, integer, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_tricentric_practice(
  text, text, text, text, text, integer, integer, integer, text, text
) TO authenticated, service_role;

-- Preserve the original four-argument API for clients that have not yet
-- adopted the expanded practice payload.
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
  v_result jsonb;
BEGIN
  IF length(trim(coalesce(p_head, ''))) = 0
     OR length(trim(coalesce(p_heart, ''))) = 0
     OR length(trim(coalesce(p_body, ''))) = 0
     OR length(trim(coalesce(p_synthesis, ''))) = 0 THEN
    RAISE EXCEPTION 'Practice requires all four reflections';
  END IF;

  IF length(coalesce(p_head, '')) > 3000
     OR length(coalesce(p_heart, '')) > 3000
     OR length(coalesce(p_body, '')) > 3000
     OR length(coalesce(p_synthesis, '')) > 5000 THEN
    RAISE EXCEPTION 'Practice input exceeds allowed size';
  END IF;

  v_result := public.complete_tricentric_practice(
    '',
    p_head,
    p_heart,
    p_body,
    p_synthesis,
    5,
    5,
    5,
    NULL,
    NULL
  );

  RETURN QUERY
  SELECT
    (v_result ->> 'practice_id')::uuid,
    (v_result ->> 'xp_awarded')::integer,
    (v_result ->> 'achievement_unlocked')::boolean;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tricentric_practice(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_tricentric_practice(text, text, text, text)
  TO authenticated, service_role;
