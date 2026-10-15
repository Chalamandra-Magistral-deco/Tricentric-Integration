import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getXPForNextLevel } from '@/lib/gamification';
import type { UserProfile, UserAchievement } from '@/types';
import type { GamificationState } from '@/types';

export function useGamification(profile: UserProfile | null) {
  const achievementRequestId = useRef(0);
  const [state, setState] = useState<GamificationState>({
    level: 1,
    xp: 0,
    nextLevelXP: 100,
    streak: 0,
    totalEvaluations: 0,
    recentAchievements: [],
    achievementsError: null,
  });

  useEffect(() => {
    const requestId = ++achievementRequestId.current;
    if (!profile) {
      setState({
        level: 1,
        xp: 0,
        nextLevelXP: 100,
        streak: 0,
        totalEvaluations: 0,
        recentAchievements: [],
        achievementsError: null,
      });
      return () => {
        achievementRequestId.current += 1;
      };
    }

    const level = calculateLevel(profile.experience_points);
    const nextLevelXP = getXPForNextLevel(level);

    setState({
      level,
      xp: profile.experience_points,
      nextLevelXP,
      streak: profile.streak_days,
      totalEvaluations: profile.total_evaluations,
      recentAchievements: [],
      achievementsError: null,
    });

    void fetchRecentAchievements(profile.id, requestId);

    return () => {
      achievementRequestId.current += 1;
    };
  }, [profile]);

  async function fetchRecentAchievements(userId: string, requestId: number) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      if (requestId === achievementRequestId.current) {
        setState((previous) => ({
          ...previous,
          recentAchievements: (data ?? []) as UserAchievement[],
          achievementsError: null,
        }));
      }
    } catch (error) {
      if (requestId === achievementRequestId.current) {
        console.error('Error loading recent achievements:', error);
        setState((previous) => ({
          ...previous,
          recentAchievements: [],
          achievementsError: 'No se pudieron cargar los logros recientes.',
        }));
      }
    }
  }

  return state;
}
