import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TricentricPracticeRecord {
  id: string;
  head_intensity: number;
  heart_intensity: number;
  body_intensity: number;
  act_score: number;
  completed_at: string;
  context_text: string;
  ai_synthesis: string | null;
  ai_feedback: string | null;
  synthesis_text: string;
}

interface ActDashboardProps {
  userId: string;
}

export const ActDashboard: React.FC<ActDashboardProps> = ({ userId }) => {
  const [history, setHistory] = useState<TricentricPracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('tricentric_practices')
        .select('id, head_intensity, heart_intensity, body_intensity, act_score, completed_at, context_text, synthesis_text, ai_synthesis, ai_feedback')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (queryError) throw queryError;
      setHistory((data ?? []) as TricentricPracticeRecord[]);
    } catch (queryError) {
      console.error('Error loading tricentric practice history:', queryError);
      setError('No se pudo cargar tu historial. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const average = (value: (record: TricentricPracticeRecord) => number) =>
    (history.reduce((total, record) => total + value(record), 0) / history.length).toFixed(1);

  return (
    <section className="act-dashboard my-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Tu historial tricéntrico
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Prácticas guardadas recientemente. Tus cifras se calculan solo con registros reales.
        </p>
      </div>

      {loading ? (
        <p className="py-6 text-center text-slate-300" data-testid="act-dashboard-loading" role="status">
          Cargando tu historial…
        </p>
      ) : error ? (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-center">
          <p className="text-sm text-red-100" role="alert">{error}</p>
          <button
            type="button"
            onClick={() => void fetchHistory()}
            className="mt-3 min-h-11 rounded-lg border border-red-700 px-4 py-2 font-semibold text-red-100 hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Reintentar
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 text-center">
          <p className="font-semibold text-slate-200">Aún no hay prácticas guardadas.</p>
          <p className="mt-2 text-sm text-slate-400">
            Cuando completes tu primer mapa, aparecerán aquí tu síntesis y tus métricas.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-slate-400">
            Promedios de estas {history.length} prácticas recientes (máximo 10).
          </p>
          <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'ACT promedio', value: `${average((record) => record.act_score)} / 100`, color: 'text-emerald-300' },
              { label: 'Cabeza', value: average((record) => record.head_intensity), color: 'text-blue-300' },
              { label: 'Corazón', value: average((record) => record.heart_intensity), color: 'text-rose-300' },
              { label: 'Cuerpo', value: average((record) => record.body_intensity), color: 'text-amber-300' },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-center sm:p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</dt>
                <dd className={`mt-1 text-xl font-extrabold sm:text-2xl ${metric.color}`}>{metric.value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mb-3 text-lg font-semibold text-slate-200">Prácticas recientes</h3>
          <ol className="space-y-3">
            {history.map((record) => (
              <li key={record.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <time dateTime={record.completed_at} className="text-xs text-slate-400">
                      {new Date(record.completed_at).toLocaleString('es', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                    {record.context_text && (
                      <p className="mt-2 text-sm font-medium text-slate-300">
                        Situación: {record.context_text}
                      </p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
                      {record.synthesis_text}
                    </p>
                    {record.ai_synthesis && (
                      <div className="mt-3 rounded-lg border border-violet-800/70 bg-violet-950/20 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-violet-200">
                          Interpretación de IA guardada por ti
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
                          {record.ai_synthesis}
                        </p>
                      </div>
                    )}
                    {record.ai_feedback && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-amber-200">
                        Tu comentario sobre la IA: {record.ai_feedback}
                      </p>
                    )}
                  </div>
                  <dl className="flex flex-wrap gap-2 text-xs font-medium">
                    <div className="rounded border border-blue-800 bg-blue-950 px-2 py-1 text-blue-200">
                      Cabeza: {record.head_intensity}
                    </div>
                    <div className="rounded border border-rose-800 bg-rose-950 px-2 py-1 text-rose-200">
                      Corazón: {record.heart_intensity}
                    </div>
                    <div className="rounded border border-amber-800 bg-amber-950 px-2 py-1 text-amber-200">
                      Cuerpo: {record.body_intensity}
                    </div>
                    <div className="rounded border border-emerald-800 bg-emerald-950 px-2 py-1 font-bold text-emerald-200">
                      ACT: {record.act_score}
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
};

export default ActDashboard;
