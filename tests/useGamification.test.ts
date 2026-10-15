import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamification } from '@/hooks/useGamification';
import type { UserProfile } from '@/types';

const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('useGamification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue({ data: [], error: null });
  });

  it('maps saved profile XP, streak and activity count into dashboard state', async () => {
    const profile: UserProfile = {
      id: 'user-1',
      display_name: 'SRAP Warrior',
      total_evaluations: 12,
      current_level: 3,
      experience_points: 525,
      streak_days: 4,
      last_evaluation_date: '2026-10-11',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-11T00:00:00Z',
    };

    const { result } = renderHook(() => useGamification(profile));

    await waitFor(() => {
      expect(result.current.level).toBe(4);
      expect(result.current.xp).toBe(525);
      expect(result.current.streak).toBe(4);
      expect(result.current.totalEvaluations).toBe(12);
    });
  });
});
