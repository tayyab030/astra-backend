export const AI_PERSONALITIES = [
  'professional',
  'casual',
  'motivational',
] as const;

export type AiPersonality = (typeof AI_PERSONALITIES)[number];

export const AI_DATA_SCOPES = ['tasks', 'productivity', 'all'] as const;

export type AiDataScope = (typeof AI_DATA_SCOPES)[number];

export const DEFAULT_AI_PERSONALITY: AiPersonality = 'professional';
export const DEFAULT_AI_VOICE_MODE = false;
export const DEFAULT_AI_INSIGHTS = true;
export const DEFAULT_AI_DATA_SCOPE: AiDataScope = 'all';

export function isAiPersonality(
  value: string | null | undefined,
): value is AiPersonality {
  return !!value && (AI_PERSONALITIES as readonly string[]).includes(value);
}

export function isAiDataScope(
  value: string | null | undefined,
): value is AiDataScope {
  return !!value && (AI_DATA_SCOPES as readonly string[]).includes(value);
}

export function personalityGuidance(personality: AiPersonality): string {
  switch (personality) {
    case 'casual':
      return 'Tone: warm, friendly, and conversational while remaining clear and helpful. Keep the British composure lightly.';
    case 'motivational':
      return 'Tone: encouraging coach — energizing, positive, and action-oriented without being pushy.';
    case 'professional':
    default:
      return 'Tone: refined British AI aide — calm, precise, composed, slightly formal (Jarvis-inspired, never claim to be Jarvis).';
  }
}

export function dataScopeGuidance(scope: AiDataScope): string {
  switch (scope) {
    case 'tasks':
      return 'Scope: focus on tasks and scheduling. Do not dig into wealth, health, or other modules unless the user clearly asks.';
    case 'productivity':
      return 'Scope: focus on productivity modules (tasks, time tracking, goals, routines). Avoid wealth/health deep dives unless the user clearly asks.';
    case 'all':
    default:
      return 'Scope: all Astra modules are in play (tasks, time, goals, wealth, health, notes, analytics).';
  }
}
