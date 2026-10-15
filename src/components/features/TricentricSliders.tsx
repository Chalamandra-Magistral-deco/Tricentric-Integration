import React, { useState, useEffect, useCallback } from 'react';
import { dispatchMatrixTelemetry } from '@/lib/telemetry';

interface TricentricSlidersProps {
  onChange: (values: { head: number; heart: number; body: number; actScore: number }) => void;
  disabled?: boolean;
}

export const TricentricSliders: React.FC<TricentricSlidersProps> = ({ onChange, disabled = false }) => {
  const [head, setHead] = useState<number>(5);
  const [heart, setHeart] = useState<number>(5);
  const [body, setBody] = useState<number>(5);
  const [actScore, setActScore] = useState<number>(100);

  const calculateACT = useCallback((h: number, hc: number, b: number) => {
    const mean = (h + hc + b) / 3.0;
    const variance = (
      Math.pow(h - mean, 2) + 
      Math.pow(hc - mean, 2) + 
      Math.pow(b - mean, 2)
    ) / 3.0;
    
    const maxVariance = 66.6667;
    const rawAct = 100.0 * (1.0 - Math.sqrt(variance / maxVariance));
    return Number(Math.max(0, Math.min(100, rawAct)).toFixed(2));
  }, []);

  useEffect(() => {
    const score = calculateACT(head, heart, body);
    setActScore(score);
    onChange({ head, heart, body, actScore: score });

    // Despachar telemetría al ecosistema Chalamandra Magistral
    dispatchMatrixTelemetry({
      event: 'ACT_SCORE_CALCULATED',
      actScore: score,
      intensities: { head, heart, body },
    });
  }, [head, heart, body, calculateACT, onChange]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold tracking-wide">Ejes Tricéntricos · ACT v1.0</h3>
        <div className="text-right">
          <span className="text-xs uppercase text-slate-300 block">Equilibrio ACT</span>
          <span className="text-2xl font-bold text-emerald-400">{actScore} <span className="text-xs text-slate-500">/ 100</span></span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-300">
        Resume cuánto se parecen las intensidades que elegiste. No determina si una decisión es
        correcta ni representa una valoración clínica.
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label htmlFor="head-intensity" className="font-medium text-cyan-300">Cabeza · análisis</label>
            <span className="font-mono text-slate-200">{head} de 10</span>
          </div>
          <input
            id="head-intensity"
            aria-valuetext={`${head} de 10`}
            type="range" min="0" max="10" value={head}
            disabled={disabled}
            onChange={(e) => setHead(Number(e.target.value))}
            className="min-h-11 w-full cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label htmlFor="heart-intensity" className="font-medium text-rose-300">Corazón · emoción y valores</label>
            <span className="font-mono text-slate-200">{heart} de 10</span>
          </div>
          <input
            id="heart-intensity"
            aria-valuetext={`${heart} de 10`}
            type="range" min="0" max="10" value={heart}
            disabled={disabled}
            onChange={(e) => setHeart(Number(e.target.value))}
            className="min-h-11 w-full cursor-pointer accent-rose-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <label htmlFor="body-intensity" className="font-medium text-amber-300">Cuerpo · sensación observada</label>
            <span className="font-mono text-slate-200">{body} de 10</span>
          </div>
          <input
            id="body-intensity"
            aria-valuetext={`${body} de 10`}
            type="range" min="0" max="10" value={body}
            disabled={disabled}
            onChange={(e) => setBody(Number(e.target.value))}
            className="min-h-11 w-full cursor-pointer accent-amber-400"
          />
        </div>
      </div>
    </div>
  );
};
