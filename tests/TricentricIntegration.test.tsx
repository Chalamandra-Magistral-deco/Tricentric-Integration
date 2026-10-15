import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TricentricIntegration from '@/components/features/tricentric/TricentricIntegration';
const rpcMock = vi.fn();
const analyzeMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock('@/hooks/useAnalysis', () => ({
  useAnalysis: () => ({
    analyze: (...args: unknown[]) => analyzeMock(...args),
    loading: false,
    error: null,
  }),
}));

vi.mock('@/components/features/TricentricSliders', () => ({
  TricentricSliders: () => <div data-testid="tricentric-sliders">Sliders Mock</div>,
}));

describe('tricentric practice submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderPractice = (userId = 'user-1') => {
    const onPracticeComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <TricentricIntegration
        userId={userId}
        onPracticeComplete={onPracticeComplete}
      />
    );
    return { onPracticeComplete };
  };

  const completeMinimumPractice = () => {
    fireEvent.change(screen.getByRole('textbox', { name: /¿Qué situación o decisión/i }), {
      target: { value: 'Una decisión personal' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /¿Qué sabes/i }), {
      target: { value: 'Head reflection' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Integración y siguiente paso/i }), {
      target: { value: 'Integrated next step' },
    });
  };

  it('allows optional center reflections while requiring context, one center, and a next step', () => {
    renderPractice();
    const submitBtn = screen.getByRole('button', { name: 'Guardar práctica' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: /¿Qué situación o decisión/i }), {
      target: { value: 'Una decisión personal' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /¿Qué sabes/i }), {
      target: { value: 'Head reflection' },
    });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: /Integración y siguiente paso/i }), {
      target: { value: 'Integrated next step' },
    });
    expect(submitBtn.disabled).toBe(false);
  });

  it('sends trimmed reflections, refreshes the profile, and reports success', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { practice_id: 'practice-1', xp_awarded: 50, achievement_unlocked: false },
      error: null,
    });
    const { onPracticeComplete } = renderPractice();
    completeMinimumPractice();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar práctica' }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('complete_tricentric_practice', {
        p_context: 'Una decisión personal',
        p_head: 'Head reflection',
        p_heart: '',
        p_body: '',
        p_synthesis: 'Integrated next step',
        p_head_intensity: 5,
        p_heart_intensity: 5,
        p_body_intensity: 5,
        p_ai_synthesis: null,
        p_ai_feedback: null,
      });
      expect(onPracticeComplete).toHaveBeenCalledOnce();
      expect(screen.getByTestId('practice-success').textContent).toContain('Práctica guardada. Recibiste 50 XP.');
    });
  });

  it('normalizes a row-shaped RPC result and shows the awarded achievement', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ practice_id: 'practice-2', xp_awarded: 200, achievement_unlocked: true }],
      error: null,
    });
    renderPractice();
    completeMinimumPractice();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar práctica' }));

    expect(await screen.findByText('Práctica guardada. Recibiste 200 XP y desbloqueaste un logro.')).toBeDefined();
  });

  it('sends tricentric reflections to AI only on request and stores its interpretation separately by consent', async () => {
    analyzeMock.mockResolvedValueOnce('Posible tensión, pendiente de confirmar.');
    rpcMock.mockResolvedValueOnce({
      data: { practice_id: 'practice-ai', xp_awarded: 50, achievement_unlocked: false },
      error: null,
    });
    renderPractice();
    completeMinimumPractice();

    fireEvent.click(screen.getByRole('button', { name: 'Pedir síntesis asistida' }));

    expect(await screen.findByText('Posible tensión, pendiente de confirmar.')).toBeDefined();
    expect(analyzeMock).toHaveBeenCalledWith({
      type: 'tricentric',
      context: 'Una decisión personal',
      head: 'Head reflection',
      heart: '',
      body: '',
      synthesis: 'Integrated next step',
    });

    fireEvent.change(screen.getByRole('textbox', { name: /Tu corrección o desacuerdo/i }), {
      target: { value: 'La hipótesis no refleja una parte importante.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Conservar por separado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar práctica' }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('complete_tricentric_practice', {
        p_context: 'Una decisión personal',
        p_head: 'Head reflection',
        p_heart: '',
        p_body: '',
        p_synthesis: 'Integrated next step',
        p_head_intensity: 5,
        p_heart_intensity: 5,
        p_body_intensity: 5,
        p_ai_synthesis: 'Posible tensión, pendiente de confirmar.',
        p_ai_feedback: 'La hipótesis no refleja una parte importante.',
      });
    });
  });

  it('reports database error responses correctly', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: '23505' },
    });
    const { onPracticeComplete } = renderPractice();
    completeMinimumPractice();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar práctica' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Ya guardaste una práctica tricéntrica hoy.');
      expect(onPracticeComplete).not.toHaveBeenCalled();
    });
  });

  it('does not report a failed save as successful or refresh rewards', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'Database unavailable' },
    });
    const { onPracticeComplete } = renderPractice();
    completeMinimumPractice();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar práctica' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.queryByTestId('practice-success')).toBeNull();
    expect(onPracticeComplete).not.toHaveBeenCalled();
  });

  it('limits reflection fields to the database-supported lengths', () => {
    renderPractice();
    const headInput = screen.getByRole('textbox', { name: /¿Qué sabes/i });
    const contextInput = screen.getByRole('textbox', { name: /¿Qué situación o decisión/i });
    const synthesisInput = screen.getByRole('textbox', { name: /Integración y siguiente paso/i });

    expect(headInput.getAttribute('maxlength')).toBe('3000');
    expect(contextInput.getAttribute('maxlength')).toBe('3000');
    expect(synthesisInput.getAttribute('maxlength')).toBe('5000');
  });
});
