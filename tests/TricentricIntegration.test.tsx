// Simular variables de entorno de Supabase antes de cualquier importación
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'mock-anon-key';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TricentricIntegration from '@/components/features/tricentric/TricentricIntegration';
import { supabase } from '@/lib/supabase';

vi.mock('@lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@components/features/TricentricSliders', () => ({
  TricentricSliders: () => <div data-testid="tricentric-sliders">Sliders Mock</div>,
}));

describe('tricentric practice submission', () => {
  const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' }, close: () => {} } as unknown as Window);
  });

  const renderPractice = (userId = 'user-1') => {
    const onPracticeComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <TricentricIntegration
        userId={userId}
        onPracticeComplete={onPracticeComplete}
        stripeUrl="https://stripe.com/test"
      />
    );
    return { onPracticeComplete };
  };

  const completeReflections = () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'HEAD reflection' }), {
      target: { value: 'Head reflection' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'HEART reflection' }), {
      target: { value: 'Heart reflection' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'BODY reflection' }), {
      target: { value: 'Body reflection' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Integrative synthesis' }), {
      target: { value: 'Integrated next step' },
    });
  };

  it('requires all four non-empty reflections before enabling submission', () => {
    renderPractice();
    const submitBtn = screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    completeReflections();
    expect(submitBtn.disabled).toBe(false);
  });

  it('sends trimmed reflections, refreshes the profile, and reports success', async () => {
    rpcMock.mockResolvedValue({
      data: { practice_id: 'practice-1', xp_awarded: 50, achievement_unlocked: false },
      error: null,
    } as never);
    const { onPracticeComplete } = renderPractice();
    completeReflections();

    fireEvent.click(screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('complete_tricentric_practice', {
        p_head: 'Head reflection',
        p_heart: 'Heart reflection',
        p_body: 'Body reflection',
        p_synthesis: 'Integrated next step',
        p_head_intensity: 5,
        p_heart_intensity: 5,
        p_body_intensity: 5,
        p_act_score: 100,
      });
      expect(onPracticeComplete).toHaveBeenCalledOnce();
      expect(window.alert).toHaveBeenCalledWith('Practice saved. +50 XP earned (ACT Score: 100).');
    });
  });

  it('reports a duplicate daily submission without refreshing the profile', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '23505' },
    } as never);
    const { onPracticeComplete } = renderPractice();
    completeReflections();

    fireEvent.click(screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Today’s tricentric practice has already been completed.');
      expect(onPracticeComplete).not.toHaveBeenCalled();
    });
  });

  it('prompts unauthenticated users to log in without calling the RPC', async () => {
    renderPractice(undefined);
    completeReflections();

    fireEvent.click(screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' }));

    expect(window.alert).toHaveBeenCalledWith('Please log in to save your progress.');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('limits reflection fields to the database-supported lengths', () => {
    renderPractice();
    const headInput = screen.getByRole('textbox', { name: 'HEAD reflection' });
    const synthesisInput = screen.getByRole('textbox', { name: 'Integrative synthesis' });

    expect(headInput.getAttribute('maxlength')).toBe('3000');
    expect(synthesisInput.getAttribute('maxlength')).toBe('5000');
  });
});
