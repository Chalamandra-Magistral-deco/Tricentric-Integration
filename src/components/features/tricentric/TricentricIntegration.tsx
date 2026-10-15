import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { TricentricSliders } from '@/components/features/TricentricSliders';
import { useAnalysis } from '@/hooks/useAnalysis';
import { completeTricentricPractice } from '@/services/tricentricPractice';

const MAX_REFLECTION_LENGTH = 3000;
const MAX_SYNTHESIS_LENGTH = 5000;
const MAX_AI_FEEDBACK_LENGTH = 3000;

interface Props {
  userId?: string;
  onPracticeComplete: () => Promise<void>;
}

type Center = 'HEAD' | 'HEART' | 'BODY';

const CENTERS: {
  name: Center;
  label: string;
  icon: string;
  description: string;
  prompt: string;
  guidance: string;
  cardClasses: string;
  titleClasses: string;
  textareaClasses: string;
}[] = [
  {
    name: 'HEAD',
    label: 'Cabeza',
    icon: '🧠',
    description: 'Análisis y comprensión',
    prompt: '¿Qué sabes, qué supones y qué alternativas tienes?',
    guidance: 'Anota hechos, evidencias, consecuencias, riesgos y supuestos por comprobar.',
    cardClasses: 'border-blue-900',
    titleClasses: 'text-blue-300',
    textareaClasses: 'focus:border-blue-400',
  },
  {
    name: 'HEART',
    label: 'Corazón',
    icon: '💛',
    description: 'Emociones y valores',
    prompt: '¿Qué emociones, necesidades o valores reconoces?',
    guidance: 'Usa tus propias palabras; la emoción que nombras es tu experiencia, no un diagnóstico.',
    cardClasses: 'border-rose-900',
    titleClasses: 'text-rose-300',
    textareaClasses: 'focus:border-rose-400',
  },
  {
    name: 'BODY',
    label: 'Cuerpo',
    icon: '🌿',
    description: 'Sensaciones observadas',
    prompt: '¿Qué notas en tu cuerpo, si hay algo que quieras registrar?',
    guidance: 'Describe una sensación y su contexto. No hace falta atribuirle un significado.',
    cardClasses: 'border-emerald-900',
    titleClasses: 'text-emerald-300',
    textareaClasses: 'focus:border-emerald-400',
  },
];

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return typeof error.code === 'string' ? error.code : undefined;
  }

  return undefined;
}

export default function TricentricIntegration({ userId, onPracticeComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [headText, setHeadText] = useState('');
  const [heartText, setHeartText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [synthesis, setSynthesis] = useState('');
  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiDecision, setAiDecision] = useState<'keep' | 'reject' | null>(null);
  const [actValues, setActValues] = useState({ head: 5, heart: 5, body: 5, actScore: 100 });
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');
  const breathingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiRequestId = useRef(0);
  const { analyze, loading: analyzing, error: analysisError } = useAnalysis();

  useEffect(() => {
    return () => {
      if (breathingTimer.current) clearInterval(breathingTimer.current);
    };
  }, []);

  const toggleBreathing = () => {
    if (!breathingTimer.current) {
      setBreathingActive(true);
      breathingTimer.current = setInterval(() => {
        setBreathingPhase((previous) => previous === 'inhale' ? 'exhale' : 'inhale');
      }, 4000);
      return;
    }

    clearInterval(breathingTimer.current);
    breathingTimer.current = null;
    setBreathingActive(false);
    setBreathingPhase('inhale');
  };

  const canSubmitPractice =
    context.trim().length > 0 &&
    context.length <= MAX_REFLECTION_LENGTH &&
    [headText, heartText, bodyText].every((value) => value.length <= MAX_REFLECTION_LENGTH) &&
    [headText, heartText, bodyText].some((value) => value.trim().length > 0) &&
    synthesis.trim().length > 0 &&
    synthesis.length <= MAX_SYNTHESIS_LENGTH &&
    aiFeedback.length <= MAX_AI_FEEDBACK_LENGTH;

  const updateReflection = (center: Center, value: string) => {
    invalidateAiSynthesis();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (center === 'HEAD') setHeadText(value);
    if (center === 'HEART') setHeartText(value);
    if (center === 'BODY') setBodyText(value);
  };

  const invalidateAiSynthesis = useCallback(() => {
    aiRequestId.current += 1;
    setAiSynthesis(null);
    setAiFeedback('');
    setAiDecision(null);
  }, []);

  const handleActChange = useCallback((values: typeof actValues) => {
    setActValues(values);
    invalidateAiSynthesis();
  }, [invalidateAiSynthesis]);

  const generateAiSynthesis = async () => {
    if (!userId) {
      setErrorMessage('Inicia sesión para solicitar un análisis privado.');
      return;
    }

    if (
      !context.trim() ||
      !synthesis.trim() ||
      ![headText, heartText, bodyText].some((value) => value.trim())
    ) {
      setErrorMessage('Añade el contexto, al menos una perspectiva y tu síntesis antes de consultar la IA.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    const requestId = ++aiRequestId.current;
    const result = await analyze({
      type: 'tricentric',
      context: context.trim(),
      head: headText.trim(),
      heart: heartText.trim(),
      body: bodyText.trim(),
      synthesis: synthesis.trim(),
    });

    if (result && requestId === aiRequestId.current) {
      setAiSynthesis(result);
      setAiFeedback('');
      setAiDecision(null);
    }
  };

  const finalizePractice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setErrorMessage('Inicia sesión para guardar tu práctica en tu historial personal.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await completeTricentricPractice({
        context: context.trim(),
        head: headText.trim(),
        heart: heartText.trim(),
        body: bodyText.trim(),
        synthesis: synthesis.trim(),
        aiSynthesis: aiDecision === 'keep' ? aiSynthesis : null,
        aiFeedback: aiFeedback.trim() || null,
        headIntensity: actValues.head,
        heartIntensity: actValues.heart,
        bodyIntensity: actValues.body,
      });

      await onPracticeComplete();
      setSuccessMessage(
        `Práctica guardada. Recibiste ${result.xpAwarded} XP` +
          (result.achievementUnlocked ? ' y desbloqueaste un logro.' : '.'),
      );
      setContext('');
      setHeadText('');
      setHeartText('');
      setBodyText('');
      setSynthesis('');
      setAiSynthesis(null);
      setAiFeedback('');
      setAiDecision(null);
    } catch (error) {
      if (getErrorCode(error) === '23505') {
        setErrorMessage('Ya guardaste una práctica tricéntrica hoy. Tu historial conserva ese registro.');
      } else {
        setErrorMessage('No se pudo guardar la práctica. Tus respuestas siguen aquí; inténtalo de nuevo.');
        console.error('Error saving tricentric practice:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tricentric-integration mx-auto my-8 max-w-6xl rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-6 md:p-8">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
          Mapa tricéntrico
        </p>
        <h2 className="text-2xl font-black text-white sm:text-3xl">
          Una decisión, tres perspectivas
        </h2>
        <p className="mt-3 leading-relaxed text-slate-300">
          Describe la situación y explora cada centro con tus propias palabras. Después,
          encuentra coincidencias, tensiones y una siguiente acción que tú elijas.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Si inicias sesión y completas la práctica, tus respuestas se guardan en tu cuenta.
          Solo se envían a Gemini si eliges pedir una síntesis asistida por IA.
        </p>
      </div>

      <div className="mb-8">
        <TricentricSliders
          onChange={handleActChange}
          disabled={loading}
        />
      </div>

      <form onSubmit={finalizePractice}>
        <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
          <label htmlFor="tricentric-context" className="block text-lg font-bold text-white">
            ¿Qué situación o decisión quieres explorar?
          </label>
          <p id="context-guidance" className="mb-3 mt-2 text-sm text-slate-400">
            Comparte solo el contexto que te ayude a pensar. Evita incluir datos personales de otras personas.
          </p>
          <textarea
            id="tricentric-context"
            className="min-h-28 w-full resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus:border-slate-300"
            placeholder="Describe brevemente la decisión o situación..."
            value={context}
            maxLength={MAX_REFLECTION_LENGTH}
            required
            disabled={loading}
            aria-describedby="context-guidance context-count"
            onChange={(event) => {
              invalidateAiSynthesis();
              setContext(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
          <p id="context-count" className="mt-1 text-right text-xs text-slate-500">
            {context.length}/{MAX_REFLECTION_LENGTH}
          </p>
        </section>

        <p className="mb-3 text-sm text-slate-400">
          Registra al menos una perspectiva; las otras dos son opcionales.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {CENTERS.map((center) => {
            const value = center.name === 'HEAD'
              ? headText
              : center.name === 'HEART'
                ? heartText
                : bodyText;
            const inputId = `reflection-${center.name.toLowerCase()}`;

            return (
              <fieldset
                key={center.name}
                className={`min-w-0 rounded-2xl border bg-slate-900 p-4 sm:p-5 ${center.cardClasses}`}
              >
                <legend className={`px-2 text-lg font-bold ${center.titleClasses}`}>
                  <span aria-hidden="true">{center.icon} </span>
                  {center.label}
                </legend>
                <p className="mb-3 text-sm text-slate-400">{center.description}</p>
                <label htmlFor={inputId} className="mb-2 block font-semibold text-slate-100">
                  {center.prompt}
                </label>
                <p id={`${inputId}-guidance`} className="mb-3 text-sm leading-relaxed text-slate-400">
                  {center.guidance}
                </p>
                <p className="mb-2 text-xs font-medium text-slate-400">Opcional</p>
                <textarea
                  id={inputId}
                  className={`min-h-36 w-full resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-white placeholder:text-slate-500 ${center.textareaClasses}`}
                  placeholder="Escribe solo lo que quieras registrar..."
                  value={value}
                  maxLength={MAX_REFLECTION_LENGTH}
                  disabled={loading}
                  aria-describedby={`${inputId}-guidance ${inputId}-count`}
                  onChange={(event) => updateReflection(center.name, event.target.value)}
                />
                <p id={`${inputId}-count`} className="mt-1 text-right text-xs text-slate-500">
                  {value.length}/{MAX_REFLECTION_LENGTH}
                </p>
              </fieldset>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl border border-amber-800/70 bg-amber-950/20 p-4 sm:p-6">
          <label htmlFor="tricentric-synthesis" className="block text-lg font-bold text-amber-200">
            Integración y siguiente paso
          </label>
          <p id="synthesis-guidance" className="mb-3 mt-2 text-sm leading-relaxed text-slate-300">
            ¿Qué coincide o se contradice entre los centros? ¿Qué alternativa o incertidumbre
            queda abierta? Cierra con una conclusión provisional o una acción elegida por ti.
          </p>
          <textarea
            id="tricentric-synthesis"
            className="min-h-32 w-full resize-y rounded-xl border border-amber-700 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus:border-amber-300"
            placeholder="Mi siguiente paso será..."
            value={synthesis}
            maxLength={MAX_SYNTHESIS_LENGTH}
            required
            disabled={loading}
            aria-describedby="synthesis-guidance synthesis-count"
            onChange={(event) => {
              invalidateAiSynthesis();
              setSynthesis(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
          <p id="synthesis-count" className="mt-1 text-right text-xs text-slate-500">
            {synthesis.length}/{MAX_SYNTHESIS_LENGTH}
          </p>
        </section>

        <section className="my-6 rounded-2xl border border-violet-800/70 bg-violet-950/20 p-4 sm:p-6">
          <h3 className="text-lg font-bold text-violet-200">Síntesis asistida por IA · opcional</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Al pulsar, enviaremos el contexto, las perspectivas que escribiste y tu síntesis a Gemini,
            un proveedor externo, para proponer coincidencias, tensiones e incertidumbres. Puede
            equivocarse; no es un diagnóstico ni decide por ti. No incluyas datos identificables.
            La respuesta no se guardará con tu práctica a menos que la marques para conservarla.
            Si la rechazas, el texto generado no se guarda; tu comentario, si escribes uno, permanece separado.
          </p>
          <button
            type="button"
            onClick={() => void generateAiSynthesis()}
            disabled={
              loading ||
              analyzing ||
              !context.trim() ||
              !synthesis.trim() ||
              ![headText, heartText, bodyText].some((value) => value.trim())
            }
            className="mt-4 min-h-12 w-full rounded-xl border border-violet-500 px-5 py-3 font-bold text-violet-100 hover:bg-violet-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {analyzing ? 'Preparando una reflexión…' : 'Pedir síntesis asistida'}
          </button>
          {analysisError && (
            <p className="mt-3 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-100" role="alert">
              {analysisError}
            </p>
          )}
          {aiSynthesis && (
            <div className="mt-5 rounded-xl border border-violet-800 bg-slate-950 p-4">
              <h4 className="font-semibold text-violet-200">Interpretación tentativa generada por IA</h4>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                {aiSynthesis}
              </p>
              <label htmlFor="ai-synthesis-feedback" className="mb-2 mt-4 block text-sm font-medium text-slate-200">
                Tu corrección o desacuerdo (opcional)
              </label>
              <textarea
                id="ai-synthesis-feedback"
                value={aiFeedback}
                maxLength={MAX_AI_FEEDBACK_LENGTH}
                disabled={loading || analyzing}
                onChange={(event) => setAiFeedback(event.target.value)}
                className="min-h-20 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                aria-describedby="ai-feedback-count"
              />
              <p id="ai-feedback-count" className="mt-1 text-right text-xs text-slate-400">
                {aiFeedback.length}/{MAX_AI_FEEDBACK_LENGTH}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAiDecision('keep')}
                  disabled={loading || analyzing}
                  aria-pressed={aiDecision === 'keep'}
                  className="min-h-11 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  Conservar por separado
                </button>
                <button
                  type="button"
                  onClick={() => setAiDecision('reject')}
                  disabled={loading || analyzing}
                  aria-pressed={aiDecision === 'reject'}
                  className="min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Rechazar la interpretación
                </button>
              </div>
              {aiDecision && (
                <p className="mt-3 text-sm text-slate-300" role="status">
                  {aiDecision === 'keep'
                    ? 'Se guardará aparte de tu síntesis personal.'
                    : 'La respuesta de IA no se guardará; tu comentario seguirá identificado como tuyo.'}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="my-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center sm:p-6">
          <h3 className="text-lg font-bold text-emerald-200">Pausa opcional</h3>
          <p className="mt-1 text-sm text-slate-400">
            Si te resulta cómodo, acompaña la guía con una respiración natural. Puedes detenerla cuando quieras.
          </p>
          <div
            className="my-4 text-2xl font-semibold text-slate-200"
            role="status"
            aria-live="polite"
          >
            {breathingPhase === 'inhale' ? 'Inhala con suavidad' : 'Exhala con suavidad'}
          </div>
          <button
            type="button"
            onClick={toggleBreathing}
            aria-pressed={breathingActive}
            className="min-h-11 rounded-lg border border-emerald-700 px-5 py-2 font-semibold text-emerald-100 hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {breathingActive ? 'Detener pausa' : 'Iniciar pausa'}
          </button>
        </section>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-100" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p data-testid="practice-success" className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-100" role="status">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || analyzing || !canSubmitPractice}
          className="min-h-12 w-full rounded-xl bg-amber-400 px-6 py-3 text-base font-black text-slate-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Guardando tu práctica…' : 'Guardar práctica'}
        </button>
      </form>
    </section>
  );
}
