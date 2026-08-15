import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { resolveTtsVoice } from '../../auth/constants/ai-voice';
import {
  assertGroqApiKey,
  GROQ_SPEECH_URL,
  GROQ_TTS_DIRECTION,
  GROQ_TTS_MAX_CHARS,
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

function prepareSpeechInput(text: string, useDirections: boolean): string {
  const body = sanitizeForSpeech(text);
  if (!body) return '';
  if (!useDirections) {
    return body.slice(0, GROQ_TTS_MAX_CHARS).trim();
  }
  const prefix = `${GROQ_TTS_DIRECTION} `;
  const room = Math.max(1, GROQ_TTS_MAX_CHARS - prefix.length);
  return `${prefix}${body.slice(0, room)}`.slice(0, GROQ_TTS_MAX_CHARS).trim();
}

/** Rough script detection for Orpheus (English Latin / Arabic only). */
function detectSpeechScript(
  text: string,
): 'latin' | 'arabic' | 'unsupported' {
  const sample = text.replace(/\s+/g, '');
  if (!sample) return 'latin';

  let arabic = 0;
  let latin = 0;
  let other = 0;

  for (const char of sample) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb50 && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      arabic += 1;
      continue;
    }
    if (
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a) ||
      (code >= 0x00c0 && code <= 0x024f) ||
      (code >= 0x1e00 && code <= 0x1eff) ||
      /[0-9.,!?;:'"()\-]/.test(char)
    ) {
      latin += 1;
      continue;
    }
    // Ignore common punctuation / currency symbols
    if (/[\u2000-\u206F\u20A0-\u20CF]/.test(char)) continue;
    other += 1;
  }

  const total = arabic + latin + other;
  if (total === 0) return 'latin';
  if (arabic / total >= 0.35) return 'arabic';
  if (other / total >= 0.25) return 'unsupported';
  return 'latin';
}

@Injectable()
export class GroqSpeechService {
  async createWav(
    text: string,
    options?: { voice?: string; language?: string },
  ): Promise<Buffer> {
    const apiKey = assertGroqApiKey();
    const script = detectSpeechScript(text);

    if (script === 'unsupported') {
      throw new BadRequestException(
        'Speech is only available for English and Arabic text. Switch language to English or Arabic, or mute speech.',
      );
    }

    // Prefer Arabic Orpheus when the reply itself is Arabic script (e.g. Urdu/Arabic).
    const languageForTts =
      script === 'arabic' ? 'ar' : options?.language === 'ar' ? 'ar' : 'en';

    const tts = resolveTtsVoice(languageForTts, options?.voice);
    const input = prepareSpeechInput(text, tts.useDirections);
    if (!input) {
      throw new BadRequestException('Nothing to speak.');
    }

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
          model: tts.model,
          voice: tts.voice,
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
        const err = (await response.json()) as {
          error?: { message?: string };
          message?: string;
        };
        if (err.error?.message) detail = err.error.message;
        else if (typeof err.message === 'string') detail = err.message;
      } catch {
        // ignore
      }
      throw new ServiceUnavailableException(detail);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 12 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF') {
      throw new ServiceUnavailableException(
        'Groq returned invalid audio. Try again, or switch AI speaker / language.',
      );
    }

    return buffer;
  }
}
