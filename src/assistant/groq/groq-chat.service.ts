import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ASSISTANT_HISTORY_LIMIT,
  assertGroqApiKey,
  GROQ_CHAT_MODEL,
  GROQ_CHAT_REASONING_EFFORT,
  GROQ_CHAT_URL,
  GROQ_REASONING_TOKEN_HEADROOM,
} from '../constants/groq.config';
import { ASTRA_SYSTEM_PROMPT } from '../constants/prompts';

export type GroqChatRole = 'system' | 'user' | 'assistant';

export type GroqChatMessage = {
  role: GroqChatRole;
  content: string;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function readContent(data: GroqChatCompletionResponse): string {
  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (content) {
    return content;
  }
  if (choice?.finish_reason === 'length') {
    throw new ServiceUnavailableException(
      'Groq hit the token limit while reasoning and returned no answer.',
    );
  }
  throw new ServiceUnavailableException('Groq returned an empty response.');
}

function buildPrivacyBoundary(userId: string) {
  return [
    'PRIVACY BOUNDARY (mandatory).',
    `You are assisting only signed-in user id: ${userId}.`,
    'All context below is exclusively theirs.',
    'You cannot access, load, or discuss any other Astra user\'s private data.',
    'If asked about another user, another account, or someone else\'s finances/profile, refuse and explain you only have this signed-in user\'s data.',
  ].join('\n');
}

@Injectable()
export class GroqChatService {
  /** Chat replies. `context` must include STRICT AI RULES from buildStrictAiRulesBlock. */
  async complete(options: {
    userId: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: string | null;
  }): Promise<string> {
    const apiKey = assertGroqApiKey();

    const messages: GroqChatMessage[] = [
      { role: 'system', content: ASTRA_SYSTEM_PROMPT },
      { role: 'system', content: buildPrivacyBoundary(options.userId) },
    ];

    if (options.context?.trim()) {
      messages.push({ role: 'system', content: options.context.trim() });
    }

    const history = options.history.slice(-ASSISTANT_HISTORY_LIMIT);
    messages.push(...history);

    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_CHAT_MODEL,
          messages,
          temperature: 0.7,
          max_completion_tokens: 700 + GROQ_REASONING_TOKEN_HEADROOM,
          reasoning_effort: GROQ_CHAT_REASONING_EFFORT,
          include_reasoning: false,
        }),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Failed to reach Groq chat.',
      );
    }

    const data = (await response.json()) as GroqChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? `Groq chat failed (${response.status})`,
      );
    }

    return readContent(data);
  }

  /**
   * One-off prompt (quotes, insights, future AI features).
   * Always pass `strictRules` from buildStrictAiRulesBlock so Settings → AI apply.
   */
  async completePrompt(options: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    strictRules?: string | null;
  }): Promise<string> {
    const apiKey = assertGroqApiKey();
    const messages: GroqChatMessage[] = [];
    if (options.strictRules?.trim()) {
      messages.push({ role: 'system', content: options.strictRules.trim() });
    }
    messages.push({ role: 'system', content: options.system });
    messages.push({ role: 'user', content: options.user });

    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_CHAT_MODEL,
          messages,
          temperature: options.temperature ?? 0.9,
          max_completion_tokens:
            (options.maxTokens ?? 80) + GROQ_REASONING_TOKEN_HEADROOM,
          reasoning_effort: GROQ_CHAT_REASONING_EFFORT,
          include_reasoning: false,
        }),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Failed to reach Groq chat.',
      );
    }

    const data = (await response.json()) as GroqChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? `Groq chat failed (${response.status})`,
      );
    }

    return readContent(data);
  }
}
