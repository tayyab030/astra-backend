import { Injectable } from '@nestjs/common';
import { AssistantContextService } from './context/assistant-context.service';
import { ConversationService } from './conversation/conversation.service';
import { GroqChatService } from './groq/groq-chat.service';
import { GroqSpeechService } from './groq/groq-speech.service';
import { GroqTranscribeService } from './groq/groq-transcribe.service';

@Injectable()
export class AssistantService {
  constructor(
    private readonly conversations: ConversationService,
    private readonly contextService: AssistantContextService,
    private readonly groqChat: GroqChatService,
    private readonly groqSpeech: GroqSpeechService,
    private readonly groqTranscribe: GroqTranscribeService,
  ) {}

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

  createSpeech(text: string) {
    return this.groqSpeech.createWav(text);
  }

  transcribe(options: {
    buffer?: Buffer;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
  }) {
    return this.groqTranscribe.transcribe(options);
  }
}
