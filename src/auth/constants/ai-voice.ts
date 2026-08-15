/** English Orpheus TTS voices (canopylabs/orpheus-v1-english). */
export const AI_VOICES = [
  'austin',
  'daniel',
  'troy',
  'autumn',
  'diana',
  'hannah',
] as const;

export type AiVoice = (typeof AI_VOICES)[number];

/** Current Astra default speaker (matches GROQ_TTS_VOICE). */
export const DEFAULT_AI_VOICE: AiVoice = 'austin';

export const AI_VOICE_LABELS: Record<AiVoice, string> = {
  austin: 'Austin (default)',
  daniel: 'Daniel',
  troy: 'Troy',
  autumn: 'Autumn',
  diana: 'Diana',
  hannah: 'Hannah',
};

export function isAiVoice(value: string | null | undefined): value is AiVoice {
  return !!value && (AI_VOICES as readonly string[]).includes(value);
}
