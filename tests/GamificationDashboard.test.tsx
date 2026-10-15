import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GamificationDashboard from '@/components/features/gamification/GamificationDashboard';
import type { GamificationState } from '@/types';

describe('GamificationDashboard', () => {
  it('presents the profile XP, level, streak and combined activity count', () => {
    const state: GamificationState = {
      level: 4,
      xp: 525,
      nextLevelXP: 850,
      streak: 3,
      totalEvaluations: 12,
      recentAchievements: [],
    };

    render(<GamificationDashboard state={state} />);

    expect(screen.getByText('Veterano')).toBeDefined();
    expect(screen.getByText('525 / 850 XP')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('Evaluaciones y prácticas')).toBeDefined();
    expect(screen.getByText('Días de actividad')).toBeDefined();
  });
});
