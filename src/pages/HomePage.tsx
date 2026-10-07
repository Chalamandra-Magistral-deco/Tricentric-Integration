import React, { useEffect, useState } from 'react';
import HeaderSection from '@/components/sections/HeaderSection';
import TruthsSection from '@/components/sections/TruthsSection';
import RealityMapSection from '@/components/sections/RealityMapSection';
import ExamSection from '@/components/features/exam/ExamSection';
import TricentricIntegration from '@/components/features/tricentric/TricentricIntegration';
import GamificationDashboard from '@/components/features/gamification/GamificationDashboard';
import AuthPanel from '@/components/auth/AuthPanel';
import SeoHead from '@/components/seo/SeoHead';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useGamification } from '@/hooks/useGamification';

const HomePage: React.FC = () => {
  const [userId, setUserId] = useState<string>();
  const [authChecked, setAuthChecked] = useState(false);

  const { profile, error: profileError, refreshProfile } = useProfile(userId);
  const gamificationState = useGamification(profile);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">
            💀
          </div>
          <div className="text-gray-400">Loading SRAP...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="SRAP | Diagnóstico Tricéntrico, Hábitos y Progreso Real"
        description="SRAP te ayuda a evaluar cabeza, corazón y cuerpo con diagnósticos accionables, síntesis guiada y progreso gamificado en un solo flujo diario."
      />

      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <div className="min-h-screen selection:bg-red-500 selection:text-white">
        <HeaderSection />
        <AuthPanel userId={userId} />

        <main id="main-content">
          {userId && profileError && (
            <p className="mx-auto mb-6 max-w-6xl px-6 text-center text-red-300" role="alert">
              No se pudo cargar tu perfil: {profileError}
            </p>
          )}

          {userId && profile?.id === userId && (
            <section aria-label="Tu progreso" className="max-w-6xl mx-auto px-6 -mt-8">
              <GamificationDashboard state={gamificationState} />
            </section>
          )}

          <section id="truths">
            <TruthsSection />
          </section>
          <section id="reality-map">
            <RealityMapSection />
          </section>

          <section id="exam">
            <ExamSection onEvaluationComplete={refreshProfile} />
          </section>
          <section id="integration">
            <TricentricIntegration
              userId={userId}
              onPracticeComplete={refreshProfile}
              kofiUrl="https://ko-fi.com/s/7b0236c681"
            />
          </section>

        </main>
      </div>
    </>
  );
};

export default HomePage;
