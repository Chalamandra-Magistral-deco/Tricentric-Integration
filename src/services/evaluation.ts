import { supabase } from '@/lib/supabase';
import type { CenterType } from '@/types';

export interface CompleteEvaluationInput {
  bleedingCenter: CenterType;
  sacrificeCenter: CenterType;
  oxygenActions: string[];
  synthesis: string;
  aiAnalysis: string | null;
  aiSynthesisFeedback: string | null;
}

export interface CompleteEvaluationResult {
  xpEarned: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function completeEvaluation(
  input: CompleteEvaluationInput,
): Promise<CompleteEvaluationResult> {
  const { data, error } = await supabase.rpc('complete_evaluation', {
    p_bleeding_center: input.bleedingCenter,
    p_sacrifice_center: input.sacrificeCenter,
    p_oxygen_actions: input.oxygenActions,
    p_synthesis_text: input.synthesis,
    p_ai_analysis: input.aiAnalysis ?? '',
    p_ai_synthesis_feedback: input.aiSynthesisFeedback,
  });

  if (error) throw error;
  const result: unknown = Array.isArray(data) ? data[0] : data;
  if (
    !isRecord(result) ||
    typeof result.xp_earned !== 'number' ||
    !Number.isSafeInteger(result.xp_earned) ||
    result.xp_earned < 0
  ) {
    throw new Error('La respuesta del servidor no tiene el formato esperado.');
  }

  return { xpEarned: result.xp_earned };
}
