import React from 'react';
import LevelBadge from '@/components/ui/LevelBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import { getLevelTitle } from '@/lib/gamification';
import type { GamificationState } from '@/types';

interface GamificationDashboardProps {
  state: GamificationState;
}

const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ state }) => {
  const { level, xp, nextLevelXP, streak, totalEvaluations, recentAchievements, achievementsError } = state;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-6 border border-yellow-700 mb-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <LevelBadge level={level} xp={xp} nextLevelXP={nextLevelXP} />

          <div>
            <h3 className="text-2xl font-bold text-yellow-400 mb-1">
              {getLevelTitle(level)}
            </h3>
            <p className="text-gray-400 text-sm">
              {xp} / {nextLevelXP} XP
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-red-400">{totalEvaluations}</div>
            <div className="text-xs text-gray-300 uppercase">Evaluaciones y prácticas</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-black text-yellow-400">{streak}</div>
            <div className="text-xs text-gray-300 uppercase">Días de actividad</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ProgressBar
          current={xp}
          max={nextLevelXP}
          label="Progreso hacia el próximo nivel"
          color="yellow"
        />
      </div>

      {achievementsError && (
        <p className="mt-4 text-sm text-amber-200" role="status">
          {achievementsError}
        </p>
      )}

      {recentAchievements.length > 0 && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h4 className="text-sm font-bold text-gray-300 mb-3">LOGROS RECIENTES</h4>
          <div className="flex flex-wrap gap-3">
            {recentAchievements.map((ua) => (
              <div
                key={ua.id}
                className="bg-gray-800 rounded-lg p-3 flex items-center gap-2 border border-yellow-600"
                title={ua.achievement?.description}
              >
                <span className="text-2xl">{ua.achievement?.icon}</span>
                <div>
                  <div className="text-sm font-bold text-yellow-400">
                    {ua.achievement?.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    +{ua.achievement?.xp_reward} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationDashboard;
