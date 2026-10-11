-- Asegurar columnas de métricas ACT en la tabla tricentric_practices
ALTER TABLE public.tricentric_practices 
ADD COLUMN IF NOT EXISTS head_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS heart_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS body_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS act_score INTEGER DEFAULT 100;

-- Actualizar la función RPC para recibir las intensidades y el puntaje ACT
CREATE OR REPLACE FUNCTION public.complete_tricentric_practice(
    p_head TEXT,
    p_heart TEXT,
    p_body TEXT,
    p_synthesis TEXT,
    p_head_intensity INTEGER DEFAULT 5,
    p_heart_intensity INTEGER DEFAULT 5,
    p_body_intensity INTEGER DEFAULT 5,
    p_act_score INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_practice_id UUID;
    v_streak INTEGER;
    v_xp_earned INTEGER := 50;
    v_achievement_unlocked BOOLEAN := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insertar la práctica tricéntrica con métricas ACT
    INSERT INTO public.tricentric_practices (
        user_id, 
        head_reflection, 
        heart_reflection, 
        body_reflection, 
        synthesis, 
        head_intensity,
        heart_intensity,
        body_intensity,
        act_score,
        completed_at
    )
    VALUES (
        v_user_id, 
        p_head, 
        p_heart, 
        p_body, 
        p_synthesis, 
        p_head_intensity,
        p_heart_intensity,
        p_body_intensity,
        p_act_score,
        NOW()
    )
    RETURNING id INTO v_practice_id;

    -- Actualizar perfil, XP y rachas
    UPDATE public.user_profiles
    SET 
        xp = COALESCE(xp, 0) + v_xp_earned,
        total_evaluations = COALESCE(total_evaluations, 0) + 1,
        last_evaluation_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'practice_id', v_practice_id,
        'xp_awarded', v_xp_earned,
        'achievement_unlocked', v_achievement_unlocked,
        'act_score', p_act_score
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tricentric_practice(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_tricentric_practice(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;
