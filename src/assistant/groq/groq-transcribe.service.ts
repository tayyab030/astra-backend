import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  assertGroqApiKey,
  GROQ_TRANSCRIBE_URL,
  GROQ_WHISPER_MODEL,
} from '../constants/groq.config';

@Injectable()
export class GroqTranscribeService {
  async transcribe(options: {
    buffer?: Buffer;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
  }): Promise<string> {
    const apiKey = assertGroqApiKey();
    const formData = new FormData();

    if (options.dataUrl) {
      formData.append('url', options.dataUrl);
    } else if (options.buffer) {
      const mimeType = options.mimeType || 'audio/webm';
      const fileName = options.fileName || 'voice.webm';
      const bytes = new Uint8Array(options.buffer);
      const blob = new Blob([bytes], { type: mimeType });
      formData.append('file', blob, fileName);
    } else {
      throw new BadRequestException('Audio payload is required.');
    }

    formData.append('model', GROQ_WHISPER_MODEL);
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');

    let response: Response;
    try {
      response = await fetch(GROQ_TRANSCRIBE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? error.message
          : 'Failed to reach Groq transcription.',
      );
    }

    const data = (await response.json()) as {
      text?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? `Whisper failed (${response.status})`,
      );
    }

    const text = data.text?.trim() ?? '';
    if (!text) {
      throw new BadRequestException("I didn't catch that. Please try again.");
    }

    return text;
  }
}
