import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAnalysis } from '@/hooks/useAnalysis';
import { completeEvaluation } from '@/services/evaluation';
import type { CenterType } from '@/types';

interface ExamSectionProps {
  onEvaluationComplete?: () => void | Promise<void>;
}

const CENTERS: { id: CenterType; label: string; icon: string; color: string }[] = [
  { id: 'head', label: 'Cabeza', icon: '🧠', color: 'blue' },
  { id: 'heart', label: 'Corazón', icon: '💛', color: 'rose' },
  { id: 'body', label: 'Cuerpo', icon: '🌿', color: 'emerald' },
];

const OXYGEN_OPTIONS = [
  'Cuerpo: hacer una pausa o ajustar el ritmo, si me resulta posible.',
  'Corazón: nombrar lo que siento o conversar con alguien de confianza.',
  'Cabeza: separar un hecho comprobable de una suposición.',
];

const ExamSection: React.FC<ExamSectionProps> = ({ onEvaluationComplete }) => {
  const [bleeding, setBleeding] = useState<CenterType | ''>('');
  const [sacrifice, setSacrifice] = useState<CenterType | ''>('');
  const [oxygen, setOxygen] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiSynthesisFeedback, setAiSynthesisFeedback] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const { analyze, loading: analyzing, error: analysisError } = useAnalysis();

  const handleOxygenChange = (value: string) => {
    setOxygen((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const handleAcceptReality = async () => {
    if (!bleeding || !sacrifice) {
      setMessage({ type: 'error', text: 'Elige el centro que necesita atención y el que quieres ajustar.' });
      return;
    }

    setMessage(null);
    const result = await analyze({
      type: 'misery',
      bleeding,
      sacrifice,
      oxygen,
    });

    if (result) {
      setAiAnalysis(result);
      setIsModalOpen(true);
    }
  };

  const handleAnalyzeSynthesis = async () => {
    if (!synthesis.trim()) {
      setMessage({ type: 'error', text: 'Escribe una síntesis antes de pedir una reflexión de IA.' });
      return;
    }

    setMessage(null);
    const result = await analyze({
      type: 'synthesis',
      synthesis: synthesis.trim(),
    });

    if (result) {
      setAiAnalysis(result);
      setAiSynthesisFeedback(result);
      setIsModalOpen(true);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!bleeding || !sacrifice || !synthesis.trim()) {
      setMessage({ type: 'error', text: 'Completa los centros y tu síntesis antes de guardar.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await completeEvaluation({
        bleedingCenter: bleeding,
        sacrificeCenter: sacrifice,
        oxygenActions: oxygen,
        synthesis: synthesis.trim(),
        aiAnalysis,
        aiSynthesisFeedback,
      });

      setBleeding('');
      setSacrifice('');
      setOxygen([]);
      setSynthesis('');
      setAiAnalysis(null);
      setAiSynthesisFeedback(null);
      setMessage({ type: 'success', text: `Evaluación guardada. Recibiste ${result.xpEarned} XP.` });
      await onEvaluationComplete?.();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        setMessage({ type: 'error', text: 'Ya guardaste una evaluación hoy. Tu registro anterior sigue en tu historial.' });
      } else {
        console.error('Error saving SRAP evaluation:', error);
        setMessage({ type: 'error', text: 'No se pudo guardar la evaluación. Tus respuestas siguen aquí; inténtalo de nuevo.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const loading = analyzing || saving;

  return (
    <>
      {isModalOpen && aiAnalysis && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Reflexión generada por IA"
          icon="🧭"
        >
          <p className="whitespace-pre-line text-base leading-relaxed">{aiAnalysis}</p>
          <p className="mt-4 text-sm text-slate-400">
            Es una interpretación automatizada, no un hecho ni un diagnóstico. Puedes aceptarla,
            corregirla o descartarla.
          </p>
        </Modal>
      )}

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-amber-200 sm:text-3xl">Explora tu decisión</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-slate-300">
            Señala qué perspectiva pide atención, elige un ajuste posible y escribe tu propia síntesis.
            No tienes que seguir la sugerencia de la IA para guardar tu evaluación.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:p-6">
          <fieldset className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
            <legend className="px-2 text-lg font-bold text-white">¿Qué centro necesita más atención hoy?</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CENTERS.map((center) => (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => {
                    setBleeding(center.id);
                    setMessage(null);
                  }}
                  aria-pressed={bleeding === center.id}
                  className={`min-h-14 rounded-xl border px-4 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    bleeding === center.id
                      ? 'border-amber-300 bg-amber-950/50 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span aria-hidden="true">{center.icon} </span>
                  {center.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mb-6">
            <label htmlFor="sacrifice-center" className="mb-2 block text-lg font-bold text-white">
              ¿Qué aspecto podrías ajustar o posponer por ahora?
            </label>
            <select
              id="sacrifice-center"
              value={sacrifice}
              onChange={(event) => {
                setSacrifice(event.target.value as CenterType | '');
                setMessage(null);
              }}
              className="min-h-12 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <option value="">Elige un centro</option>
              <option value="head">Cabeza: dejar un supuesto abierto y buscar evidencia.</option>
              <option value="heart">Corazón: reconocer un valor sin resolverlo todo hoy.</option>
              <option value="body">Cuerpo: adaptar el ritmo a tus límites actuales.</option>
            </select>
          </div>

          <fieldset className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
            <legend className="px-2 text-lg font-bold text-white">¿Qué apoyo pequeño te serviría?</legend>
            <div className="space-y-2">
              {OXYGEN_OPTIONS.map((option) => (
                <label key={option} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3 hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={oxygen.includes(option)}
                    onChange={() => handleOxygenChange(option)}
                    className="mt-1 size-5 shrink-0 accent-amber-400"
                  />
                  <span className="text-sm leading-relaxed text-slate-200">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="synthesis-text" className="mb-2 block text-lg font-bold text-white">
              Tu síntesis y siguiente paso
            </label>
            <p id="synthesis-guidance" className="mb-3 text-sm leading-relaxed text-slate-400">
              ¿Qué sabes, qué sigue siendo incierto y qué paso eliges? Compartir tu síntesis con IA es opcional.
            </p>
            <textarea
              id="synthesis-text"
              value={synthesis}
              onChange={(event) => {
                setSynthesis(event.target.value);
                setMessage(null);
              }}
              maxLength={5000}
              aria-describedby="synthesis-guidance synthesis-count"
              placeholder="Mi siguiente paso será..."
              className="min-h-36 w-full resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            />
            <p id="synthesis-count" className="mt-1 text-right text-xs text-slate-400">
              {synthesis.length}/5000
            </p>
          </div>

          <p className="mt-4 rounded-lg bg-slate-900 p-3 text-sm leading-relaxed text-slate-300" id="ai-privacy-note">
            Si eliges una acción de IA, se envían los centros seleccionados y/o la síntesis a SRAP-AI
            para generar una reflexión. No incluyas nombres ni datos que identifiquen a otras personas.
            Las respuestas de los centros del Mapa Tricéntrico no se envían en este paso.
          </p>

          {(message || analysisError) && (
            <div className="mt-4 space-y-2" aria-live="polite">
              {message && (
                <p
                  className={`rounded-lg p-3 text-sm ${
                    message.type === 'error'
                      ? 'border border-red-800 bg-red-950/50 text-red-100'
                      : 'border border-emerald-800 bg-emerald-950/50 text-emerald-100'
                  }`}
                  role={message.type === 'error' ? 'alert' : 'status'}
                >
                  {message.text}
                </p>
              )}
              {analysisError && (
                <p className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-100" role="alert">
                  {analysisError}
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="my-5" role="status" aria-live="polite">
              <LoadingSpinner message={saving ? 'Guardando tu evaluación…' : 'Preparando la reflexión…'} />
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleAcceptReality}
              disabled={loading}
              aria-describedby="ai-privacy-note"
              className="min-h-12 rounded-xl bg-slate-800 px-4 py-3 font-bold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pedir reflexión de IA
            </button>
            <button
              type="button"
              onClick={handleAnalyzeSynthesis}
              disabled={loading || !synthesis.trim()}
              aria-describedby="ai-privacy-note"
              className="min-h-12 rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Analizar mi síntesis
            </button>
            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={loading || !bleeding || !sacrifice || !synthesis.trim()}
              className="min-h-12 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar evaluación
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default ExamSection;
