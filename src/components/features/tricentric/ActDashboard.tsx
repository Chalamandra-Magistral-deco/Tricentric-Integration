import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TricentricPracticeRecord {
  id: string;
  head_intensity: number;
  heart_intensity: number;
  body_intensity: number;
  act_score: number;
  completed_at: string;
  synthesis: string;
}

interface ActDashboardProps {
  userId: string;
}

export const ActDashboard: React.FC<ActDashboardProps> = ({ userId }) => {
  const [history, setHistory] = useState<TricentricPracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('tricentric_practices')
          .select('id, head_intensity, heart_intensity, body_intensity, act_score, completed_at, synthesis')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching ACT history:', error);
        } else if (data) {
          setHistory(data as TricentricPracticeRecord[]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400" data-testid="act-dashboard-loading">Cargando métricas ACT...</div>;
  }

  const avgAct = history.length
    ? Math.round(history.reduce((acc, curr) => acc + (curr.act_score || 100), 0) / history.length)
    : 100;

  const avgHead = history.length
    ? (history.reduce((acc, curr) => acc + (curr.head_intensity || 5), 0) / history.length).toFixed(1)
    : '5.0';

  const avgHeart = history.length
    ? (history.reduce((acc, curr) => acc + (curr.heart_intensity || 5), 0) / history.length).toFixed(1)
    : '5.0';

  const avgBody = history.length
    ? (history.reduce((acc, curr) => acc + (curr.body_intensity || 5), 0) / history.length).toFixed(1)
    : '5.0';

  return (
    <div className="act-dashboard p-6 max-w-6xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl my-8">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        📊 Panel de Coherencia ACT & Histórico Tricéntrico
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-emerald-500/30 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Promedio ACT</span>
          <span className="text-3xl font-extrabold text-emerald-400">{avgAct} / 100</span>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-cyan-500/30 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Eje Head</span>
          <span className="text-3xl font-extrabold text-cyan-400">{avgHead}</span>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-rose-500/30 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Eje Heart</span>
          <span className="text-3xl font-extrabold text-rose-400">{avgHeart}</span>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-500/30 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Eje Body</span>
          <span className="text-3xl font-extrabold text-amber-400">{avgBody}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-slate-300">Últimas Prácticas Registradas</h4>
        {history.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No hay registros previos aún.</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">
                    {new Date(record.completed_at).toLocaleDateString()} · {new Date(record.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-slate-200 line-clamp-2 italic">
                    "{record.synthesis}"
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-2 py-1 bg-cyan-950 text-cyan-400 rounded border border-cyan-800">H: {record.head_intensity}</span>
                  <span className="px-2 py-1 bg-rose-950 text-rose-400 rounded border border-rose-800">H: {record.heart_intensity}</span>
                  <span className="px-2 py-1 bg-amber-950 text-amber-400 rounded border border-amber-800">B: {record.body_intensity}</span>
                  <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 rounded font-bold border border-emerald-800">ACT: {record.act_score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActDashboard;
