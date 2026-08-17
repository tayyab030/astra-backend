import { ServiceUnavailableException } from '@nestjs/common';

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_SPEECH_URL = 'https://api.groq.com/openai/v1/audio/speech';
export const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

export const GROQ_CHAT_MODEL =
  process.env.CONSOLE_GROQ_CHAT_MODEL?.trim() || 'openai/gpt-oss-120b';

/** GPT-OSS always reasons first, and those tokens are billed against max_completion_tokens. */
export const GROQ_CHAT_REASONING_EFFORT =
  process.env.CONSOLE_GROQ_REASONING_EFFORT?.trim() || 'low';

/** Added on top of the caller's token budget so reasoning cannot starve the actual answer. */
export const GROQ_REASONING_TOKEN_HEADROOM = 512;

export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';
export const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english';
export const GROQ_TTS_MODEL_ARABIC = 'canopylabs/orpheus-arabic-saudi';
export const GROQ_TTS_VOICE = 'austin';
export const GROQ_TTS_MAX_CHARS = 200;
export const GROQ_TTS_DIRECTION = '[composed] [formally]';

export const ASSISTANT_HISTORY_LIMIT = 40;

export function getGroqApiKey(): string {
  const key = process.env.CONSOLE_GROQ_API_KEY?.trim();
  return key || '';
}

export function assertGroqApiKey(): string {
  const key = getGroqApiKey();
  if (!key) {
    throw new ServiceUnavailableException(
      'Missing CONSOLE_GROQ_API_KEY. Add it to the backend .env file.',
    );
  }
  return key;
}
