import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
/// Ensures Express.Multer.File is available under moduleResolution nodenext.
import 'multer';
import { AssistantService } from './assistant.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GenerateInsightsDto } from './dto/generate-insights.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SpeechDto, TranscribeJsonDto } from './dto/speech.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get(['daily-quote', 'daily-quote/'])
  getDailyQuote(@Req() req: AuthenticatedRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    return this.assistantService.getDailyQuote();
  }

  @Get(['goals-quote', 'goals-quote/'])
  getGoalsQuote(@Req() req: AuthenticatedRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    return this.assistantService.getGoalsQuote();
  }

  @Post(['insights', 'insights/'])
  generateInsights(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateInsightsDto,
  ) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    return this.assistantService.generateInsights(
      req.user.sub,
      dto.kind,
      dto.context,
      dto.period,
    );
  }

  @Get(['conversations', 'conversations/'])
  listConversations(@Req() req: AuthenticatedRequest) {
    return this.assistantService.listConversations(req.user!.sub);
  }

  @Post(['conversations', 'conversations/'])
  createConversation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.assistantService.createConversation(req.user!.sub, dto.title);
  }

  @Get(['conversations/:id', 'conversations/:id/'])
  getConversation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assistantService.getConversation(req.user!.sub, id);
  }

  @Delete(['conversations/:id', 'conversations/:id/'])
  deleteConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.assistantService.deleteConversation(req.user!.sub, id);
  }

  @Patch(['conversations/:id', 'conversations/:id/'])
  updateConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.assistantService.updateConversation(
      req.user!.sub,
      id,
      dto.title,
    );
  }

  @Post(['chat', 'chat/'])
  sendMessage(@Req() req: AuthenticatedRequest, @Body() dto: SendMessageDto) {
    return this.assistantService.sendMessage(req.user!.sub, {
      conversationId: dto.conversation_id,
      message: dto.message,
    });
  }

  @Post(['speech', 'speech/'])
  async speech(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SpeechDto,
    @Res() res: Response,
  ) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    const wav = await this.assistantService.createSpeech(req.user.sub, dto.text);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(wav);
  }

  /** Web / multipart uploads */
  @Post(['transcribe', 'transcribe/'])
  @UseInterceptors(FileInterceptor('file'))
  async transcribeFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Multipart field "file" is required.');
    }
    const text = await this.assistantService.transcribe(req.user.sub, {
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
    return { text };
  }

  /** Mobile / Expo-friendly Base64 payload */
  @Post(['transcribe/base64', 'transcribe/base64/'])
  async transcribeBase64(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TranscribeJsonDto,
  ) {
    if (!req.user?.sub) {
      throw new UnauthorizedException({ detail: 'Authentication required.' });
    }
    const raw = dto.audio.trim();
    const dataUrl = raw.startsWith('data:')
      ? raw
      : `data:${dto.mime_type || 'audio/m4a'};base64,${raw}`;
    const text = await this.assistantService.transcribe(req.user.sub, {
      dataUrl,
    });
    return { text };
  }
}
