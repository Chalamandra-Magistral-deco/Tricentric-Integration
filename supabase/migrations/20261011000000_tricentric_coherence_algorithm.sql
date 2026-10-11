-- ============================================================
-- ALGORITMO DE COHERENCIA TRICÉNTRICA (ACT v1.0)
-- Calculo vectorial de disonancia entre HEAD, HEART y BODY
-- ============================================================

-- 1. Función para calcular el índice ACT (0 - 100)
CREATE OR REPLACE FUNCTION calculate_act_score(
    p_head INTEGER,
    p_heart INTEGER,
    p_body INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_mean NUMERIC;
    v_variance NUMERIC;
    v_max_variance NUMERIC := 66.6667; -- Varianza máxima teórica para valores 0-10
    v_act NUMERIC;
BEGIN
    -- Validar rangos (0-10)
    p_head  := LEAST(GREATEST(p_head, 0), 10);
    p_heart := LEAST(GREATEST(p_heart, 0), 10);
    p_body  := LEAST(GREATEST(p_body, 0), 10);

    -- Media muestral (μ)
    v_mean := (p_head + p_heart + p_body) / 3.0;

    -- Varianza (σ²)
    v_variance := (
        POWER(p_head - v_mean, 2) + 
        POWER(p_heart - v_mean, 2) + 
        POWER(p_body - v_mean, 2)
    ) / 3.0;

    -- Normalización a escala 0 - 100
    v_act := 100.0 * (1.0 - SQRT(v_variance / v_max_variance));
    
    RETURN ROUND(GREATEST(LEAST(v_act, 100.0), 0.0), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 2. Asegurar campos en la tabla de evaluaciones
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS head_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS heart_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS body_intensity INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS act_score NUMERIC(5,2) DEFAULT 100.00;

-- 3. Trigger para calcular automáticamente el ACT al insertar una evaluación
CREATE OR REPLACE FUNCTION trigger_calculate_evaluation_act()
RETURNS TRIGGER AS $$
BEGIN
    NEW.act_score := calculate_act_score(
        NEW.head_intensity,
        NEW.heart_intensity,
        NEW.body_intensity
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_act ON public.evaluations;
CREATE TRIGGER trg_calculate_act
    BEFORE INSERT OR UPDATE OF head_intensity, heart_intensity, body_intensity
    ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_evaluation_act();

COMMENT ON FUNCTION calculate_act_score IS 'Mide la armonia matemática entre lo pensado, sentido y ejecutado (HEAD, HEART, BODY)';
