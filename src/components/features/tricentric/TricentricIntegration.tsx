import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  userId?: string;
  onPracticeComplete: () => Promise<void>;
  kofiUrl: string;
}

const CENTERS = [
  {
    name: 'HEAD',
    icon: '🧠',
    desc: 'Thought • Logic • Analysis',
    cardClasses: 'hover:border-blue-500',
    titleClasses: 'text-blue-400',
    textareaClasses: 'border-blue-900 focus:border-blue-500',
  },
  {
    name: 'HEART',
    icon: '💖',
    desc: 'Emotion • Intuition • Values',
    cardClasses: 'hover:border-red-500',
    titleClasses: 'text-red-400',
    textareaClasses: 'border-red-900 focus:border-red-500',
  },
  {
    name: 'BODY',
    icon: '🦶',
    desc: 'Sensation • Instinct • Somatic Wisdom',
    cardClasses: 'hover:border-green-500',
    titleClasses: 'text-green-400',
    textareaClasses: 'border-green-900 focus:border-green-500',
  },
] as const;

export default function TricentricIntegration({ userId, onPracticeComplete, kofiUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [headText, setHeadText] = useState('');
  const [heartText, setHeartText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [synthesis, setSynthesis] = useState('');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const breathingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (breathingTimer.current) {
        clearInterval(breathingTimer.current);
      }
    };
  }, []);

  const toggleBreathing = () => {
    if (!breathingTimer.current) {
      setBreathingActive(true);
      breathingTimer.current = setInterval(() => {
        setBreathingPhase((prev) => {
          if (prev === 'inhale') return 'hold';
          if (prev === 'hold') return 'exhale';
          return 'inhale';
        });
      }, 4000);
      return;
    }

    clearInterval(breathingTimer.current);
    breathingTimer.current = null;
    setBreathingActive(false);
    setBreathingPhase('inhale');
  };

  const finalizePractice = async () => {
    if (!userId) {
      alert('Please log in to save your progress.');
      return;
    }

    setLoading(true);
    const checkoutWindow = kofiUrl ? window.open('', '_blank', 'noopener,noreferrer') : null;

    try {
      const { data, error } = await supabase.rpc('complete_tricentric_practice', {
        p_head: headText.trim(),
        p_heart: heartText.trim(),
        p_body: bodyText.trim(),
        p_synthesis: synthesis.trim(),
      });

      if (error) {
        if (error.code === '23505') {
          alert('Today’s tricentric practice has already been completed.');
          return;
        }
        throw error;
      }

      await onPracticeComplete();

      const result = data as { practice_id: string; xp_awarded: number; achievement_unlocked: boolean };
      if (checkoutWindow && kofiUrl) checkoutWindow.location.href = kofiUrl;

      setHeadText('');
      setHeartText('');
      setBodyText('');
      setSynthesis('');

      alert(
        result.achievement_unlocked
          ? `Practice saved. +${result.xp_awarded} XP earned. Redirecting to the digital version.`
          : `Practice saved. +${result.xp_awarded} XP earned.`
      );

      if (checkoutWindow && !kofiUrl) checkoutWindow.close();
    } catch (err) {
      console.error(err);
      alert('Error saving practice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tricentric-integration p-6 max-w-6xl mx-auto bg-gray-900 rounded-2xl border border-purple-900 my-12">
      <h2 className="text-3xl font-bold text-center mb-6 text-white bg-gradient-to-r from-blue-400 via-red-400 to-green-400 bg-clip-text text-transparent">
        🎯 Tricentric Integration
      </h2>

      <p className="text-center text-gray-400 mb-8 italic">
        "Wisdom is not about suppressing voices, but about directing the internal choir."
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {CENTERS.map((center) => (
          <div
            key={center.name}
            className={`centro-card rounded-2xl p-6 border-2 border-transparent transition-all ${center.cardClasses}`}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">{center.icon}</div>
              <h3 className={`font-bold text-xl ${center.titleClasses}`}>{center.name}</h3>
              <p className="text-xs text-gray-500 uppercase">{center.desc}</p>
            </div>
            <textarea
              className={`w-full h-32 p-3 rounded-lg bg-black bg-opacity-40 text-white border outline-none resize-none ${center.textareaClasses}`}
              placeholder={`What does your ${center.name.toLowerCase()} think / feel / sense?...`}
              value={center.name === 'HEAD' ? headText : center.name === 'HEART' ? heartText : bodyText}
              onChange={(event) => {
                const value = event.target.value;
                if (center.name === 'HEAD') setHeadText(value);
                else if (center.name === 'HEART') setHeartText(value);
                else setBodyText(value);
              }}
              aria-label={`${center.name} reflection`}
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl p-8 mb-8 text-center border border-gray-700">
        <h3 className="text-xl font-bold text-yellow-400 mb-4">🌬️ Conscious Breathing Practice</h3>
        <div
          className={`breathing-circle w-32 h-32 bg-gradient-to-br from-blue-400 to-green-400 rounded-full mx-auto mb-6 flex items-center justify-center transition-transform duration-[4000ms] ease-in-out ${
            breathingPhase === 'inhale' ? 'scale-100' : breathingPhase === 'hold' ? 'scale-125' : 'scale-110'
          }`}
        >
          <span className="text-4xl">🌊</span>
        </div>
        <div className="mb-6 text-gray-300">
          {breathingPhase === 'inhale' && 'Inhale deeply (4s)'}
          {breathingPhase === 'hold' && 'Hold breath (4s)'}
          {breathingPhase === 'exhale' && 'Exhale slowly (4s)'}
        </div>
        <button
          onClick={toggleBreathing}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg transition-all mb-4"
        >
          {breathingActive ? 'Stop Practice' : 'Start Practice'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-900 via-red-900 to-green-900 rounded-2xl p-8 text-center border border-yellow-600">
        <h3 className="text-2xl font-bold mb-4 text-white">🔄 Integrative Synthesis</h3>
        <textarea
          className="w-full h-24 bg-black bg-opacity-50 border border-yellow-500 rounded-lg p-4 text-white focus:outline-none mb-6 resize-none"
          placeholder="Integrate the three voices here..."
          value={synthesis}
          onChange={(event) => setSynthesis(event.target.value)}
          aria-label="Integrative synthesis"
        />
        <button
          onClick={finalizePractice}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-xl transition-all transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'SAVING...' : 'GET THE DIGITAL DECISION MAP'}
        </button>
      </div>

      <div className="mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
        <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">📘 Section 2 · Somatic Guide</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-bold text-yellow-300 mb-4">🦶 Body Dictionary</h4>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <span className="text-red-400 mr-2">💢</span>
                <strong className="text-red-300">Chest pressure:</strong> a sensation you can observe; ask what emotion, context or boundary may be relevant.
              </p>
              <p>
                <span className="text-blue-400 mr-2">🌀</span>
                <strong className="text-blue-300">Shaky hands:</strong> a bodily sensation that may accompany stress or activation; treat it as a cue to pause and observe.
              </p>
              <p>
                <span className="text-green-400 mr-2">😴</span>
                <strong className="text-green-300">Persistent fatigue:</strong> a signal worth observing alongside sleep, workload and other context; it does not prove a values mismatch.
              </p>
              <p>
                <span className="text-purple-400 mr-2">🌊</span>
                <strong className="text-purple-300">Expanded breathing:</strong> a subjective sense of ease that can be used as a reflection cue, not as proof of a decision.
              </p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-bold text-yellow-300 mb-4">💫 Integration Example</h4>
            <p className="text-sm text-gray-300 mb-4">
              <strong className="text-blue-300">Head:</strong> Financial transition is viable in 6 months.
            </p>
            <p className="text-sm text-gray-300 mb-4">
              <strong className="text-red-300">Heart:</strong> There is fear, but also real excitement.
            </p>
            <p className="text-sm text-gray-300 mb-4">
              <strong className="text-green-300">Body:</strong> Breath opens when imagining the change.
            </p>
            <p className="text-sm text-yellow-200 bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <strong>Integrated action:</strong> start with a gradual transition that protects stability while honoring passion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
