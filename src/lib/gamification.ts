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



export function getLevelTitle(level: number): string {
  const titles = [
    'Principiante',           // 1
    'Aprendiz',               // 2
    'En entrenamiento',       // 3
    'Veterano',               // 4
    'Superviviente',          // 5
    'Integrador',             // 6
    'Observador',             // 7
    'Explorador',             // 8
    'Referente',              // 9
    'Maestría personal',      // 10
  ];

  return titles[level - 1] || titles[0];
}
