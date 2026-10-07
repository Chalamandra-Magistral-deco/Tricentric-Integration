// Core types for SRAP application

export type CenterType = 'head' | 'heart' | 'body';

export interface UserProfile {
  id: string;
  display_name: string;
  total_evaluations: number;
  current_level: number;
  experience_points: number;
  streak_days: number;
  last_evaluation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  user_id: string;
  bleeding_center: CenterType;
  sacrifice_center: CenterType;
  oxygen_actions: string[];
  synthesis_text: string;
  ai_analysis: string;
  ai_synthesis_feedback: string | null;
  xp_earned: number;
  completed_at: string;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}


export interface GamificationState {
  level: number;
  xp: number;
  nextLevelXP: number;
  streak: number;
  totalEvaluations: number;
  recentAchievements: UserAchievement[];
}
