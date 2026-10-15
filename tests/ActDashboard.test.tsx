import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActDashboard from '@/components/features/tricentric/ActDashboard';

const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('ActDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state initially and then displays metrics and history', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          head_intensity: 8,
          heart_intensity: 6,
          body_intensity: 7,
          act_score: 95,
          completed_at: '2026-10-11T03:00:00Z',
          synthesis_text: 'Acción alineada',
        },
      ],
      error: null,
    });

    fromMock.mockReturnValue({
      select: selectMock,
    });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });

    render(<ActDashboard userId="user-1" />);

    expect(screen.getByTestId('act-dashboard-loading')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('95.0 / 100')).toBeDefined();
      expect(screen.getByText('Acción alineada', { exact: false })).toBeDefined();
    });
  });

  it('shows an empty state without presenting default or invented metrics', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });

    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });

    render(<ActDashboard userId="user-1" />);

    expect(await screen.findByText('Aún no hay prácticas guardadas.')).toBeDefined();
    expect(screen.queryByText(/100\.0 \/ 100/)).toBeNull();
    expect(screen.queryByText(/5\.0/)).toBeNull();
  });
});
