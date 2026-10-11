import React, { useState, useEffect } from 'react';

interface TricentricSlidersProps {
  onChange: (values: { head: number; heart: number; body: number; actScore: number }) => void;
}

export const TricentricSliders: React.FC<TricentricSlidersProps> = ({ onChange }) => {
  const [head, setHead] = useState<number>(5);
  const [heart, setHeart] = useState<number>(5);
  const [body, setBody] = useState<number>(5);
  const [actScore, setActScore] = useState<number>(100);

  useEffect(() => {
    // Cálculo local espejo del algoritmo SQL ACT (v1.0)
    const mean = (head + heart + body) / 3.0;
    const variance = (
      Math.pow(head - mean, 2) + 
      Math.pow(heart - mean, 2) + 
      Math.pow(body - mean, 2)
    ) / 3.0;
    
    const maxVariance = 66.6667;
    const rawAct = 100.0 * (1.0 - Math.sqrt(variance / maxVariance));
    const score = Number(Math.max(0, Math.min(100, rawAct)).toFixed(2));

    setActScore(score);
    onChange({ head, heart, body, actScore: score });
  }, [head, heart, body, onChange]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold tracking-wide">Ejes Tricéntricos · ACT v1.0</h3>
        <div className="text-right">
          <span className="text-xs uppercase text-slate-400 block">Índice de Coherencia</span>
          <span className="text-2xl font-bold text-emerald-400">{actScore} <span className="text-xs text-slate-500">/ 100</span></span>
        </div>
      </div>

      <div className="space-y-4">
        {/* HEAD */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-cyan-400">Head (Cabeza / Análisis)</span>
            <span className="font-mono text-slate-300">{head}</span>
          </div>
          <input 
            type="range" min="0" max="10" value={head} 
            onChange={(e) => setHead(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* HEART */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-rose-400">Heart (Corazón / Vínculo)</span>
            <span className="font-mono text-slate-300">{heart}</span>
          </div>
          <input 
            type="range" min="0" max="10" value={heart} 
            onChange={(e) => setHeart(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        {/* BODY */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-amber-400">Body (Cuerpo / Ejecución)</span>
            <span className="font-mono text-slate-300">{body}</span>
          </div>
          <input 
            type="range" min="0" max="10" value={body} 
            onChange={(e) => setBody(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
