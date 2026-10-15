import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeTricentricPractice,
  type CompleteTricentricPracticeInput,
} from '@/services/tricentricPractice';

const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const input: CompleteTricentricPracticeInput = {
  context: 'A decision',
  head: 'Facts',
  heart: '',
  body: 'Tension',
  synthesis: 'I will compare the options.',
  aiSynthesis: 'A possible tension.',
  aiFeedback: null,
  headIntensity: 7,
  heartIntensity: 5,
  bodyIntensity: 8,
};

describe('completeTricentricPractice service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends all ten RPC arguments and normalizes the result for the UI', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        practice_id: 'practice-1',
        xp_awarded: 200,
        achievement_unlocked: true,
        act_score: 91.25,
      },
      error: null,
    });

    await expect(completeTricentricPractice(input)).resolves.toEqual({
      practiceId: 'practice-1',
      xpAwarded: 200,
      achievementUnlocked: true,
    });
    expect(rpcMock).toHaveBeenCalledWith('complete_tricentric_practice', {
      p_context: 'A decision',
      p_head: 'Facts',
      p_heart: '',
      p_body: 'Tension',
      p_synthesis: 'I will compare the options.',
      p_ai_synthesis: 'A possible tension.',
      p_ai_feedback: null,
      p_head_intensity: 7,
      p_heart_intensity: 5,
      p_body_intensity: 8,
    });
  });

  it('normalizes a row-shaped result and rejects malformed RPC responses', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ practice_id: 'practice-2', xp_awarded: 50, achievement_unlocked: false }],
      error: null,
    });
    await expect(completeTricentricPractice(input)).resolves.toEqual({
      practiceId: 'practice-2',
      xpAwarded: 50,
      achievementUnlocked: false,
    });

    rpcMock.mockResolvedValueOnce({
      data: { practice_id: 'practice-3', xp_awarded: -1, achievement_unlocked: false },
      error: null,
    });
    await expect(completeTricentricPractice(input)).rejects.toThrow(
      'La respuesta del servidor no tiene el formato esperado.',
    );
  });
});
