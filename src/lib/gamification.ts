// Gamification engine - XP calculations and level progression

export const LEVEL_CONFIG = {
  MAX_LEVEL: 10,
  BASE_XP_PER_EVALUATION: 50,
  STREAK_BONUS_PER_DAY: 10,
  XP_CURVE: [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    850,    // Level 5
    1300,   // Level 6
    1900,   // Level 7
    2700,   // Level 8
    3750,   // Level 9
    5000,   // Level 10
  ]
};

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_CONFIG.XP_CURVE.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_CONFIG.XP_CURVE[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_CONFIG.MAX_LEVEL) {
    return LEVEL_CONFIG.XP_CURVE[LEVEL_CONFIG.MAX_LEVEL - 1];
  }
  return LEVEL_CONFIG.XP_CURVE[currentLevel];
}

export function calculateXPGained(streakDays: number, hasHonestSynthesis: boolean = false): number {
  let xp = LEVEL_CONFIG.BASE_XP_PER_EVALUATION;
  xp += streakDays * LEVEL_CONFIG.STREAK_BONUS_PER_DAY;
  if (hasHonestSynthesis) xp += 50;
  return xp;
}

export function shouldUnlockAchievement(
  achievementKey: string,
  userStats: {
    totalEvaluations: number;
    currentLevel: number;
    streakDays: number;
    hasHonestSynthesis?: boolean;
  }
): boolean {
  const conditions: Record<string, boolean> = {
    'first_blood': userStats.totalEvaluations === 1,
    'week_warrior': userStats.streakDays >= 7,
    'month_survivor': userStats.streakDays >= 30,
    'level_5': userStats.currentLevel >= 5,
    'level_10': userStats.currentLevel >= 10,
    'ten_evaluations': userStats.totalEvaluations >= 10,
    'honest_synthesis': Boolean(userStats.hasHonestSynthesis),
  };

  return conditions[achievementKey] || false;
}

export function getLevelTitle(level: number): string {
  const titles = [
    'Lost Novice',           // 1
    'Apprentice of Pain',       // 2
    'Warrior in Training',    // 3
    'Scarred Veteran',     // 4
    'Hardened Survivor',       // 5
    'Master of Sacrifices',   // 6
    'Reality Seer',    // 7
    'Abyss Commander',    // 8
    'Brutal Legend',           // 9
    'Supreme Decoder',    // 10
  ];

  return titles[level - 1] || titles[0];
}
