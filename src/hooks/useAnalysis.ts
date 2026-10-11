import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CenterType } from '@/types';

interface AnalysisRequest {
  type: 'misery' | 'synthesis';
  bleeding?: CenterType;
  sacrifice?: CenterType;
  oxygen?: string[];
  synthesis?: string;
  head_intensity?: number;
  heart_intensity?: number;
  body_intensity?: number;
  act_score?: number;
}

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSystemPrompt = (type: 'misery' | 'synthesis', actScore?: number) => {
    const actContext = actScore !== undefined ? ` [Índice ACT de Coherencia: ${actScore}/100]` : '';
    return type === 'misery'
      ? `You are SRAP-AI${actContext}. Be direct, philosophical and useful. Analyze the tension between the selected bleeding center, sacrifice, and tricentric coherence variance. Do not diagnose.`
      : `You are SRAP-AI${actContext}. Evaluate clarity versus self-deception based on tricentric alignment. Be direct and useful. Do not diagnose or present speculation as fact.`;
  };

  const analyze = async (request: AnalysisRequest): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inicia sesión para acceder al análisis.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('Configuración de Supabase incompleta.');

      const response = await fetch(`${supabaseUrl}/functions/v1/srap-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `Error remoto (${response.status}).`);
      }

      if (typeof data.analysis !== 'string' || !data.analysis.trim()) {
        throw new Error('El servicio de análisis devolvió una respuesta vacía.');
      }

      return data.analysis.trim();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión con SRAP-AI';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error };
}
