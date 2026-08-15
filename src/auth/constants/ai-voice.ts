/** Orpheus English voices (canopylabs/orpheus-v1-english). */
export const AI_ENGLISH_VOICES = [
  'austin',
  'daniel',
  'troy',
  'autumn',
  'diana',
  'hannah',
] as const;

/** Orpheus Arabic Saudi voices (canopylabs/orpheus-arabic-saudi). */
export const AI_ARABIC_VOICES = [
  'abdullah',
  'fahad',
  'sultan',
  'lulwa',
  'noura',
  'aisha',
] as const;

export const AI_VOICES = [
  ...AI_ENGLISH_VOICES,
  ...AI_ARABIC_VOICES,
] as const;

export type AiEnglishVoice = (typeof AI_ENGLISH_VOICES)[number];
export type AiArabicVoice = (typeof AI_ARABIC_VOICES)[number];
export type AiVoice = (typeof AI_VOICES)[number];

/** Current Astra default speaker (English). */
export const DEFAULT_AI_VOICE: AiVoice = 'austin';
export const DEFAULT_AI_ARABIC_VOICE: AiArabicVoice = 'abdullah';

export const AI_VOICE_LABELS: Record<AiVoice, string> = {
  austin: 'Austin (English)',
  daniel: 'Daniel (English)',
  troy: 'Troy (English)',
  autumn: 'Autumn (English)',
  diana: 'Diana (English)',
  hannah: 'Hannah (English)',
  abdullah: 'Abdullah (Arabic)',
  fahad: 'Fahad (Arabic)',
  sultan: 'Sultan (Arabic)',
  lulwa: 'Lulwa (Arabic)',
  noura: 'Noura (Arabic)',
  aisha: 'Aisha (Arabic)',
};

export function isAiVoice(value: string | null | undefined): value is AiVoice {
  return !!value && (AI_VOICES as readonly string[]).includes(value);
}

export function isEnglishVoice(
  value: string | null | undefined,
): value is AiEnglishVoice {
  return !!value && (AI_ENGLISH_VOICES as readonly string[]).includes(value);
}

export function isArabicVoice(
  value: string | null | undefined,
): value is AiArabicVoice {
  return !!value && (AI_ARABIC_VOICES as readonly string[]).includes(value);
}

export function resolveTtsVoice(
  language: string | null | undefined,
  preferred?: string | null,
): { model: string; voice: string; useDirections: boolean } {
  if (language === 'ar') {
    return {
      model: 'canopylabs/orpheus-arabic-saudi',
      voice: isArabicVoice(preferred) ? preferred : DEFAULT_AI_ARABIC_VOICE,
      useDirections: false,
    };
  }

  // All non-Arabic languages use English Orpheus (including Latin-script replies).
  return {
    model: 'canopylabs/orpheus-v1-english',
    voice: isEnglishVoice(preferred) ? preferred : DEFAULT_AI_VOICE,
    useDirections: true,
  };
}
