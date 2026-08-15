import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  assertGroqApiKey,
  GROQ_SPEECH_URL,
  GROQ_TTS_DIRECTION,
  GROQ_TTS_MAX_CHARS,
  GROQ_TTS_MODEL,
  GROQ_TTS_VOICE,
} from '../constants/groq.config';

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/[_#>]/g, ' ')
    .replace(/[[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function withDirection(text: string): string {
  const body = sanitizeForSpeech(text);
  if (!body) return '';
  return `${GROQ_TTS_DIRECTION} ${body}`.slice(0, GROQ_TTS_MAX_CHARS).trim();
}

@Injectable()
export class GroqSpeechService {
  async createWav(text: string, voice?: string): Promise<Buffer> {
    const apiKey = assertGroqApiKey();
    const input = withDirection(text);
    if (!input) {
      throw new BadRequestException('Nothing to speak.');
    }

    const resolvedVoice = voice?.trim() || GROQ_TTS_VOICE;

    let response: Response;
    try {
      response = await fetch(GROQ_SPEECH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
        },
        body: JSON.stringify({
          model: GROQ_TTS_MODEL,
          voice: resolvedVoice,
          input,
          response_format: 'wav',
        }),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Failed to reach Groq speech.',
      );
    }

    if (!response.ok) {
      let detail = `Groq TTS failed (${response.status})`;
      try {
        const err = (await response.json()) as { error?: { message?: string } };
        if (err.error?.message) detail = err.error.message;
      } catch {
        // ignore
      }
      throw new ServiceUnavailableException(detail);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
