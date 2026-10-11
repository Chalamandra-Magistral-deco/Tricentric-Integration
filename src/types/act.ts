export type CenterType = 'head' | 'heart' | 'body';

export interface TricentricIntensities {
  head_intensity: number;
  heart_intensity: number;
  body_intensity: number;
  act_score?: number;
}
