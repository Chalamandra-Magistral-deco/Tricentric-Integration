import React, { useEffect, useState } from 'react';
import HeaderSection from '@/components/sections/HeaderSection';
import TruthsSection from '@/components/sections/TruthsSection';
import RealityMapSection from '@/components/sections/RealityMapSection';
import ExamSection from '@/components/features/exam/ExamSection';
import TricentricIntegration from '@/components/features/tricentric/TricentricIntegration';
import ActDashboard from '@/components/features/tricentric/ActDashboard';
import GamificationDashboard from '@/components/features/gamification/GamificationDashboard';
import AuthPanel from '@/components/auth/AuthPanel';
import OfferSection from '@/components/sections/OfferSection';
import SeoHead from '@/components/seo/SeoHead';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useGamification } from '@/hooks/useGamification';

const HomePage: React.FC = () => {
  const [userId, setUserId] = useState<string>();
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { profile, error: profileError, refreshProfile } = useProfile(userId);
  const gamificationState = useGamification(profile);

  useEffect(() => {
    let mounted = true;
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      setUserId(session?.user?.id);
      setAuthError(null);
      setAuthChecked(true);
    });

    void supabase.auth.getUser()
      .then(({ data: { user }, error }) => {
        if (!mounted || receivedAuthEvent) return;
        if (error) throw error;
        setUserId(user?.id);
      })
      .catch((error: unknown) => {
        if (!mounted || receivedAuthEvent) return;
        setAuthError('No se pudo verificar la sesión. Puedes volver a intentarlo iniciando sesión.');
        console.error('Error verifying the current session:', error);
      })
      .finally(() => {
        if (mounted && !receivedAuthEvent) setAuthChecked(true);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">
            💀
          </div>
          <div className="text-gray-300">Cargando SRAP…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="SRAP | Mapa Tricéntrico para Decisiones Difíciles"
        description="Usa el Mapa Tricéntrico para ordenar una decisión difícil desde cabeza, corazón y cuerpo y cerrar con una síntesis y una siguiente acción."
      />

      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <div className="min-h-screen selection:bg-red-500 selection:text-white">
        <HeaderSection isAuthenticated={Boolean(userId)} />
        <AuthPanel userId={userId} />
        {authError && (
          <p className="mx-auto mb-6 max-w-xl px-6 text-center text-red-200" role="alert">
            {authError}
          </p>
        )}

        <main id="main-content">
          <OfferSection />

          {userId && profileError && (
            <p className="mx-auto mb-6 max-w-6xl px-6 text-center text-red-300" role="alert">
              No se pudo cargar tu perfil: {profileError}
            </p>
          )}

          {userId && profile?.id === userId && (
            <>
              <section aria-label="Tu progreso" className="max-w-6xl mx-auto px-6 -mt-8">
                <GamificationDashboard state={gamificationState} />
              </section>
              <section id="dashboard" aria-label="Tu historial tricéntrico" className="max-w-6xl mx-auto px-6">
                <ActDashboard userId={userId} />
              </section>
            </>
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
            />
          </section>

        </main>
      </div>
    </>
  );
};

export default HomePage;
