import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssistantConversation } from '../entities/assistant-conversation.entity';
import {
  AssistantMessage,
  AssistantMessageRole,
} from '../entities/assistant-message.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(AssistantConversation)
    private readonly conversationRepository: Repository<AssistantConversation>,
    @InjectRepository(AssistantMessage)
    private readonly messageRepository: Repository<AssistantMessage>,
  ) {}

  async listConversations(userId: string) {
    const conversations = await this.conversationRepository.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
    return conversations.map((item) => this.serializeConversation(item));
  }

  async createConversation(userId: string, title = 'New chat') {
    const conversation = this.conversationRepository.create({
      user_id: userId,
      title: title.slice(0, 200),
    });
    const saved = await this.conversationRepository.save(conversation);
    return this.serializeConversation(saved);
  }

  async getConversationWithMessages(userId: string, conversationId: string) {
    const conversation = await this.findOwnedConversation(
      userId,
      conversationId,
    );
    const messages = await this.messageRepository.find({
      where: { conversation_id: conversationId, user_id: userId },
      order: { created_at: 'ASC' },
    });

    return {
      conversation: this.serializeConversation(conversation),
      messages: messages.map((message) => this.serializeMessage(message)),
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.findOwnedConversation(
      userId,
      conversationId,
    );
    await this.messageRepository.delete({
      conversation_id: conversation.id,
      user_id: userId,
    });
    await this.conversationRepository.delete({
      id: conversation.id,
      user_id: userId,
    });
    return { message: 'Conversation deleted' };
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    title: string,
  ) {
    const conversation = await this.findOwnedConversation(
      userId,
      conversationId,
    );
    conversation.title = title.trim().slice(0, 200) || 'New chat';
    const saved = await this.conversationRepository.save(conversation);
    return this.serializeConversation(saved);
  }

  async resolveConversation(userId: string, conversationId?: string) {
    if (conversationId) {
      return this.findOwnedConversation(userId, conversationId);
    }
    return this.conversationRepository.save(
      this.conversationRepository.create({
        user_id: userId,
        title: 'New chat',
      }),
    );
  }

  async appendMessage(options: {
    userId: string;
    conversationId: string;
    role: AssistantMessageRole;
    content: string;
  }) {
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        user_id: options.userId,
        conversation_id: options.conversationId,
        role: options.role,
        content: options.content,
      }),
    );

    await this.conversationRepository.update(
      { id: options.conversationId, user_id: options.userId },
      { updated_at: new Date() },
    );

    return message;
  }

  async listHistoryForModel(userId: string, conversationId: string) {
    const messages = await this.messageRepository.find({
      where: { conversation_id: conversationId, user_id: userId },
      order: { created_at: 'ASC' },
    });

    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  async maybeSetTitleFromFirstMessage(
    conversation: AssistantConversation,
    firstUserMessage: string,
  ) {
    if (conversation.title !== 'New chat') return conversation;

    const title = firstUserMessage.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!title) return conversation;

    conversation.title = title;
    return this.conversationRepository.save(conversation);
  }

  serializeConversation(conversation: AssistantConversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    };
  }

  serializeMessage(message: AssistantMessage) {
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
    };
  }

  private async findOwnedConversation(userId: string, conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, user_id: userId },
    });
    if (!conversation) {
      throw new NotFoundException({ detail: 'Conversation not found.' });
    }
    return conversation;
  }
}
