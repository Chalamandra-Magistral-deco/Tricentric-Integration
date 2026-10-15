import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CenterType } from '@/types';

type AnalysisRequest =
  | {
      type: 'misery';
      bleeding: CenterType;
      sacrifice: CenterType;
      oxygen: string[];
    }
  | {
      type: 'synthesis';
      synthesis: string;
    }
  | {
      type: 'tricentric';
      context: string;
      head: string;
      heart: string;
      body: string;
      synthesis: string;
    };

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (request: AnalysisRequest): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inicia sesión para acceder al análisis.');

      const { data, error: invokeError } = await supabase.functions.invoke('srap-analysis', {
        body: request,
      });

      if (invokeError) {
        const response = 'context' in invokeError ? invokeError.context : null;
        if (response instanceof Response) {
          const body: unknown = await response.clone().json().catch(() => null);
          if (
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof body.error === 'string'
          ) {
            throw new Error(body.error);
          }
        }
        throw new Error('No se pudo completar el análisis. Inténtalo de nuevo más tarde.');
      }

      if (
        typeof data !== 'object' ||
        data === null ||
        !('analysis' in data) ||
        typeof data.analysis !== 'string' ||
        !data.analysis.trim()
      ) {
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
