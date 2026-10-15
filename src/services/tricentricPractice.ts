import { supabase } from '@/lib/supabase';

export interface CompleteTricentricPracticeInput {
  context: string;
  head: string;
  heart: string;
  body: string;
  synthesis: string;
  aiSynthesis: string | null;
  aiFeedback: string | null;
  headIntensity: number;
  heartIntensity: number;
  bodyIntensity: number;
}

export interface CompleteTricentricPracticeResult {
  practiceId: string;
  xpAwarded: number;
  achievementUnlocked: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeResult(data: unknown): CompleteTricentricPracticeResult {
  const result = Array.isArray(data) ? data[0] : data;

  if (
    !isRecord(result) ||
    typeof result.practice_id !== 'string' ||
    result.practice_id.trim().length === 0 ||
    typeof result.xp_awarded !== 'number' ||
    !Number.isSafeInteger(result.xp_awarded) ||
    result.xp_awarded < 0 ||
    typeof result.achievement_unlocked !== 'boolean'
  ) {
    throw new Error('La respuesta del servidor no tiene el formato esperado.');
  }

  return {
    practiceId: result.practice_id,
    xpAwarded: result.xp_awarded,
    achievementUnlocked: result.achievement_unlocked,
  };
}

export async function completeTricentricPractice(
  input: CompleteTricentricPracticeInput,
): Promise<CompleteTricentricPracticeResult> {
  const reflections = [input.head, input.heart, input.body];
  if (
    !input.context.trim() ||
    !input.synthesis.trim() ||
    !reflections.some((reflection) => reflection.trim())
  ) {
    throw new Error('Añade el contexto, una perspectiva y tu siguiente paso.');
  }

  if (
    input.context.length > 3000 ||
    reflections.some((reflection) => reflection.length > 3000) ||
    input.synthesis.length > 5000 ||
    (input.aiSynthesis?.length ?? 0) > 5000 ||
    (input.aiFeedback?.length ?? 0) > 3000
  ) {
    throw new Error('Una de tus respuestas supera el límite permitido.');
  }

  if (
    [input.headIntensity, input.heartIntensity, input.bodyIntensity]
      .some((value) => !Number.isInteger(value) || value < 0 || value > 10)
  ) {
    throw new Error('Las intensidades deben estar entre 0 y 10.');
  }

  const { data, error } = await supabase.rpc('complete_tricentric_practice', {
    p_context: input.context,
    p_head: input.head,
    p_heart: input.heart,
    p_body: input.body,
    p_synthesis: input.synthesis,
    p_ai_synthesis: input.aiSynthesis,
    p_ai_feedback: input.aiFeedback,
    p_head_intensity: input.headIntensity,
    p_heart_intensity: input.heartIntensity,
    p_body_intensity: input.bodyIntensity,
  });

  if (error) throw error;
  return normalizeResult(data);
}
