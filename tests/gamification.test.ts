import { describe, expect, it } from 'vitest';
import {
  calculateLevel,
  getLevelTitle,
  getXPForNextLevel,
  LEVEL_CONFIG,
} from '../src/lib/gamification';

describe('gamification progression', () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [249, 2],
    [250, 3],
    [499, 3],
    [500, 4],
    [849, 4],
    [850, 5],
    [1299, 5],
    [1300, 6],
    [1899, 6],
    [1900, 7],
    [2699, 7],
    [2700, 8],
    [3749, 8],
    [3750, 9],
    [4999, 9],
    [5000, 10],
    [10000, 10],
  ])('calculates level %i XP => level %i', (xp, expectedLevel) => {
    expect(calculateLevel(xp)).toBe(expectedLevel);
  });

  it.each([
    [1, 100],
    [9, 5000],
    [10, 5000],
    [11, 5000],
  ])('returns next-level threshold for level %i', (level, expectedXP) => {
    expect(getXPForNextLevel(level)).toBe(expectedXP);
  });

  it('uses the configured maximum level', () => {
    expect(LEVEL_CONFIG.MAX_LEVEL).toBe(10);
  });

  it('returns the matching title and falls back for an invalid level', () => {
    expect(getLevelTitle(1)).toBe('Lost Novice');
    expect(getLevelTitle(10)).toBe('Supreme Decoder');
    expect(getLevelTitle(0)).toBe('Lost Novice');
  });
});
