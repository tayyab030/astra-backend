import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DEFAULT_AI_VOICE, isAiVoice } from '../auth/constants/ai-voice';
import { AssistantContextService } from './context/assistant-context.service';
import { ConversationService } from './conversation/conversation.service';
import { DailyQuoteService } from './daily-quote.service';
import { GroqChatService } from './groq/groq-chat.service';
import { GroqSpeechService } from './groq/groq-speech.service';
import { GroqTranscribeService } from './groq/groq-transcribe.service';

@Injectable()
export class AssistantService {
  constructor(
    private readonly authService: AuthService,
    private readonly conversations: ConversationService,
    private readonly contextService: AssistantContextService,
    private readonly groqChat: GroqChatService,
    private readonly groqSpeech: GroqSpeechService,
    private readonly groqTranscribe: GroqTranscribeService,
    private readonly dailyQuote: DailyQuoteService,
  ) {}

  getDailyQuote() {
    return this.dailyQuote.getDailyQuote();
  }

  listConversations(userId: string) {
    return this.conversations.listConversations(userId);
  }

  createConversation(userId: string, title?: string) {
    return this.conversations.createConversation(userId, title);
  }

  getConversation(userId: string, conversationId: string) {
    return this.conversations.getConversationWithMessages(
      userId,
      conversationId,
    );
  }

  deleteConversation(userId: string, conversationId: string) {
    return this.conversations.deleteConversation(userId, conversationId);
  }

  updateConversation(userId: string, conversationId: string, title: string) {
    return this.conversations.updateConversation(
      userId,
      conversationId,
      title,
    );
  }

  async sendMessage(
    userId: string,
    options: { conversationId?: string; message: string },
  ) {
    const content = options.message.trim();
    const conversation = await this.conversations.resolveConversation(
      userId,
      options.conversationId,
    );

    const userMessage = await this.conversations.appendMessage({
      userId,
      conversationId: conversation.id,
      role: 'user',
      content,
    });

    await this.conversations.maybeSetTitleFromFirstMessage(
      conversation,
      content,
    );

    const [history, context] = await Promise.all([
      this.conversations.listHistoryForModel(userId, conversation.id),
      this.contextService.buildLiveContext(userId),
    ]);

    const reply = await this.groqChat.complete({
      userId,
      history,
      context,
    });

    const assistantMessage = await this.conversations.appendMessage({
      userId,
      conversationId: conversation.id,
      role: 'assistant',
      content: reply,
    });

    const refreshed = await this.conversations.resolveConversation(
      userId,
      conversation.id,
    );

    return {
      conversation: this.conversations.serializeConversation(refreshed),
      user_message: this.conversations.serializeMessage(userMessage),
      assistant_message: this.conversations.serializeMessage(assistantMessage),
    };
  }

  async createSpeech(userId: string, text: string) {
    const user = await this.authService.getMe(userId);
    const voice = isAiVoice(user.ai_voice) ? user.ai_voice : DEFAULT_AI_VOICE;
    return this.groqSpeech.createWav(text, {
      voice,
      language: user.ai_language,
    });
  }

  async transcribe(
    userId: string,
    options: {
      buffer?: Buffer;
      fileName?: string;
      mimeType?: string;
      dataUrl?: string;
    },
  ) {
    const user = await this.authService.getMe(userId);
    return this.groqTranscribe.transcribe({
      ...options,
      language: user.ai_language,
    });
  }
}
