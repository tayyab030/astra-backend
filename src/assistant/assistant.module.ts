import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { WealthModule } from '../wealth/wealth.module';
import { PrayerModule } from '../prayer/prayer.module';
import { TasksModule } from '../tasks/tasks.module';
import { GoalsModule } from '../goals/goals.module';
import { HabitsModule } from '../habits/habits.module';
import { HealthModule } from '../health/health.module';
import { NotesModule } from '../notes/notes.module';
import { TimeTrackModule } from '../time-track/time-track.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantContextService } from './context/assistant-context.service';
import { ConversationService } from './conversation/conversation.service';
import { DailyQuoteService } from './daily-quote.service';
import { AssistantConversation } from './entities/assistant-conversation.entity';
import { AssistantMessage } from './entities/assistant-message.entity';
import { GroqChatService } from './groq/groq-chat.service';
import { GroqSpeechService } from './groq/groq-speech.service';
import { GroqTranscribeService } from './groq/groq-transcribe.service';
import { InsightsService } from './insights.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssistantConversation, AssistantMessage]),
    AuthModule,
    WealthModule,
    PrayerModule,
    TasksModule,
    GoalsModule,
    HabitsModule,
    HealthModule,
    NotesModule,
    TimeTrackModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    ConversationService,
    AssistantContextService,
    DailyQuoteService,
    InsightsService,
    GroqChatService,
    GroqSpeechService,
    GroqTranscribeService,
  ],
})
export class AssistantModule {}
