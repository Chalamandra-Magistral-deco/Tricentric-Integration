import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAnalysis } from '@/hooks/useAnalysis';
import { supabase } from '@/lib/supabase';
import type { CenterType } from '@/types';

interface ExamSectionProps {
  onEvaluationComplete?: () => void;
}

const ExamSection: React.FC<ExamSectionProps> = ({ onEvaluationComplete }) => {
  const [bleeding, setBleeding] = useState<CenterType | ''>('');
  const [sacrifice, setSacrifice] = useState<CenterType | ''>('');
  const [oxygen, setOxygen] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState<string>('');

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { analyze, loading: analyzing, error: analysisError } = useAnalysis();

  const handleOxygenChange = (value: string) => {
    setOxygen(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const handleAcceptReality = async () => {
    if (!bleeding || !sacrifice) {
      alert("Complete diagnostic and sacrifice first.");
      return;
    }

    const result = await analyze({
      type: 'misery',
      bleeding: bleeding as CenterType,
      sacrifice: sacrifice as CenterType,
      oxygen,
    });

    setAiAnalysis(result);
    setIsModalOpen(true);
  };

  const handleAnalyzeSynthesis = async () => {
    if (!synthesis.trim()) {
      alert("Write your synthesis first.");
      return;
    }

    const result = await analyze({
      type: 'synthesis',
      synthesis,
    });

    setAiAnalysis(result);
    setIsModalOpen(true);
  };

  const handleSaveEvaluation = async () => {
    if (!bleeding || !sacrifice || !synthesis.trim()) {
      alert("Complete all fields before saving.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("You must log in to save evaluations.");
        return;
      }

      const { data, error } = await supabase.rpc('complete_evaluation', {
        p_bleeding_center: bleeding,
        p_sacrifice_center: sacrifice,
        p_oxygen_actions: oxygen,
        p_synthesis_text: synthesis.trim(),
        p_ai_analysis: aiAnalysis || '',
        p_ai_synthesis_feedback: null,
      });

      if (error) {
        if (error.code === '23505') {
          alert("Today's evaluation has already been completed.");
        } else {
          throw error;
        }
        return;
      }

      const result = data as {
        xp_earned: number;
        experience_points: number;
        current_level: number;
        streak_days: number;
        total_evaluations: number;
        achievement_xp: number;
      };

      setBleeding('');
      setSacrifice('');
      setOxygen([]);
      setSynthesis('');
      setAiAnalysis(null);

      alert(`Evaluation saved. +${result.xp_earned} XP earned.`);

      if (onEvaluationComplete) onEvaluationComplete();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Error saving evaluation.');
    } finally {
      setSaving(false);
    }
  };

  const OXYGEN_OPTIONS = [
    "5 minutes of conscious breathing (Body)",
    "Write 1 unfiltered raw truth (Heart)",
    "Do 1 real survival calculation (Head)"
  ];

  const loading = analyzing || saving;

  return (
    <>
      {isModalOpen && aiAnalysis && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="AI DIAGNOSIS"
          icon="🎯"
        >
          <p className="whitespace-pre-line text-lg font-medium tracking-tight">{aiAnalysis}</p>
        </Modal>
      )}
      <section className="py-12 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 text-red-400">🎯 SRAP EXAM - RAW REALITY</h2>
        
        {analysisError && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-center">
            {analysisError}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-red-800 shadow-2xl">
          <div className="text-center mb-8">
            <div className="breathing-crudo w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">💀</span>
            </div>
            <p className="text-gray-400 italic mb-4 text-lg">
              "Enlightenment is not perpetual peace. It is knowing that fear in the chest,
              mental calculation and trembling in the hands are the normal orchestra of being alive."
            </p>
            <p className="text-yellow-400 font-bold text-xl uppercase tracking-widest">
              Wisdom is not letting any drown the others.
            </p>
          </div>

          {loading && (
            <div className="my-8">
              <LoadingSpinner message={saving ? 'SAVING REALITY...' : 'ANALYZING...'} />
            </div>
          )}

          <div className="space-y-8">
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
                    <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-3">
                      <span className="bg-red-400/10 text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                      RAW DIAGNOSIS
                    </h3>
                    <p className="text-gray-300 mb-6 text-lg">Which of the three centers is bleeding MOST today?</p>
                    
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'head' as CenterType, label: 'Head', icon: '🧠', ringColor: 'ring-blue-400', bgColor: 'bg-blue-900' },
                  { id: 'heart' as CenterType, label: 'Heart', icon: '💔', ringColor: 'ring-red-400', bgColor: 'bg-red-900' },
                  { id: 'body' as CenterType, label: 'Body', icon: '🦶', ringColor: 'ring-green-400', bgColor: 'bg-green-900' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBleeding(item.id)}
                    aria-pressed={bleeding === item.id}
                    className={`flex flex-col items-center gap-4 p-6 ${item.bgColor} bg-opacity-20 rounded-2xl cursor-pointer transition-all duration-300 ring-2 focus:outline-none focus:ring-offset-4 focus:ring-offset-gray-900 ${bleeding === item.id ? item.ringColor + ' scale-105 bg-opacity-40 shadow-lg' : 'ring-transparent hover:bg-opacity-30'}`}
                  >
                    <span className="text-4xl" aria-hidden="true">{item.icon}</span>
                    <span className="font-bold text-gray-200 text-lg">{item.label}</span>
                  </button>
                ))}
              </div>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
                    <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-3">
                      <span className="bg-red-400/10 text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                      CONSCIOUS SACRIFICE
                    </h3>
                    <p className="text-gray-300 mb-6 text-lg">Which center has to give in TODAY so the other two survive?</p>
                    
              <select
                value={sacrifice}
                onChange={e => setSacrifice(e.target.value as CenterType)}
                aria-label="Today's sacrifice"
                className="w-full bg-black/60 text-white p-4 rounded-xl border border-red-600/50 focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all text-lg"
              >
                <option value="">Choose today's sacrifice...</option>
                <option value="head">Head: Accept chaos, stop controlling</option>
                <option value="heart">Heart: Postpone dreams, accept reality</option>
                <option value="body">Body: Ignore fatigue, keep moving</option>
              </select>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
                    <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-3">
                      <span className="bg-red-400/10 text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                      SURVIVAL OXYGEN
                    </h3>
                    <p className="text-gray-300 mb-6 text-lg">What minimal action can give oxygen to the most drowned center?</p>
                    
                    <div className="space-y-4">
                      {OXYGEN_OPTIONS.map(opt => (
                        <label key={opt} className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all border ${oxygen.includes(opt) ? 'bg-red-900/40 border-red-600 shadow-inner' : 'bg-gray-700/50 border-transparent hover:bg-gray-700'}`}>
                            <input
                              type="checkbox"
                              checked={oxygen.includes(opt)}
                              onChange={() => handleOxygenChange(opt)}
                              className="w-6 h-6 text-red-500 bg-gray-800 border-gray-600 rounded-lg focus:ring-red-500 accent-red-500"
                            />
                            <span className="text-gray-200">{opt}</span>
                        </label>
                      ))}
                    </div>
                </div>
            </div>

            <div className="mt-12 p-8 bg-red-900/10 border-2 border-yellow-600/30 rounded-3xl shadow-inner">
                <h3 className="text-2xl font-black text-yellow-500 mb-6 flex items-center gap-3">
                  <span className="text-3xl">💎</span>
                  RAW INTEGRATION
                </h3>
                <textarea 
                    id="synthesis-text"
                    value={synthesis}
                    onChange={e => setSynthesis(e.target.value)}
                    aria-label="Raw integration synthesis"
                    maxLength={5000}
                    placeholder='Write your realistic synthesis. Example: "Today the body bleeds most. I will sacrifice mental control (head) to give 10 minutes of rest to the body. The heart will wait until tomorrow."'
                    className="w-full h-40 bg-black/40 border border-yellow-600/50 rounded-2xl p-6 text-white text-lg focus:outline-none resize-none focus:ring-2 focus:ring-yellow-400/50 transition-all placeholder:text-gray-600"
                ></textarea>
                
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={handleAcceptReality}
                disabled={loading}
                className="w-full sm:w-auto bg-red-700 hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl transition-all pulse-realidad disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:animate-none shadow-xl transform hover:-translate-y-1 active:translate-y-0"
              >
                💀 ACCEPT REALITY
              </button>
              <button
                onClick={handleAnalyzeSynthesis}
                disabled={loading || !synthesis.trim()}
                className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-black font-black py-4 px-10 rounded-2xl transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-xl transform hover:-translate-y-1 active:translate-y-0"
              >
                🔬 ANALYZE
              </button>
              <button
                onClick={handleSaveEvaluation}
                disabled={loading || !bleeding || !sacrifice || !synthesis.trim()}
                className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white font-black py-4 px-10 rounded-2xl transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-xl transform hover:-translate-y-1 active:translate-y-0"
              >
                💾 SAVE
              </button>
            </div>
            </div>
        </div>
      </section>
    </>
  );
};

export default ExamSection;
