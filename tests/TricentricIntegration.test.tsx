import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TricentricIntegration from '../src/components/features/tricentric/TricentricIntegration';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

const rpcMock = vi.mocked(supabase.rpc);

function renderPractice(userId: string | null = 'user-1') {
  const onPracticeComplete = vi.fn().mockResolvedValue(undefined);
  render(
    <TricentricIntegration
      userId={userId ?? undefined}
      onPracticeComplete={onPracticeComplete}
      stripeUrl=""
    />,
  );

  return { onPracticeComplete };
}

function completeReflections() {
  fireEvent.change(screen.getByLabelText('HEAD reflection'), {
    target: { value: '  Head reflection  ' },
  });
  fireEvent.change(screen.getByLabelText('HEART reflection'), {
    target: { value: '  Heart reflection  ' },
  });
  fireEvent.change(screen.getByLabelText('BODY reflection'), {
    target: { value: '  Body reflection  ' },
  });
  fireEvent.change(screen.getByLabelText('Integrative synthesis'), {
    target: { value: '  Integrated next step  ' },
  });
}

describe('tricentric practice submission', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('requires all four non-empty reflections before enabling submission', () => {
    renderPractice();
    const submitButton = screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' });

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('HEAD reflection'), {
      target: { value: 'Head' },
    });
    fireEvent.change(screen.getByLabelText('HEART reflection'), {
      target: { value: 'Heart' },
    });
    fireEvent.change(screen.getByLabelText('BODY reflection'), {
      target: { value: 'Body' },
    });
    fireEvent.change(screen.getByLabelText('Integrative synthesis'), {
      target: { value: '   ' },
    });

    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Integrative synthesis'), {
      target: { value: 'Synthesis' },
    });

    expect((submitButton as HTMLButtonElement).disabled).toBe(false);
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
      });
      expect(onPracticeComplete).toHaveBeenCalledOnce();
      expect(window.alert).toHaveBeenCalledWith('Practice saved. +50 XP earned.');
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
      expect(window.alert).toHaveBeenCalledWith(
        'Today’s tricentric practice has already been completed.',
      );
    });
    expect(onPracticeComplete).not.toHaveBeenCalled();
  });

  it('prompts unauthenticated users to log in without calling the RPC', async () => {
    renderPractice(null);
    completeReflections();

    fireEvent.click(screen.getByRole('button', { name: 'GET THE DIGITAL DECISION MAP' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please log in to save your progress.');
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('limits reflection fields to the database-supported lengths', () => {
    renderPractice();

    expect(screen.getByLabelText('HEAD reflection').getAttribute('maxLength')).toBe('3000');
    expect(screen.getByLabelText('HEART reflection').getAttribute('maxLength')).toBe('3000');
    expect(screen.getByLabelText('BODY reflection').getAttribute('maxLength')).toBe('3000');
    expect(screen.getByLabelText('Integrative synthesis').getAttribute('maxLength')).toBe('5000');
  });
});
