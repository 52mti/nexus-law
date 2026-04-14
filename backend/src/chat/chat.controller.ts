// backend/src/chat/chat.controller.ts
import { Controller, Post, Body, Sse, MessageEvent, Get, Query, Param, Delete } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post('stream')
  @Sse('stream')
  stream(
    @Body('prompt') prompt: string,
    @Body('sessionId') sessionId?: string,
    @Body('userId') userId?: string,
  ): Observable<MessageEvent> {
    return this.chatService.streamChat(
      prompt,
      sessionId,
      userId,
    ) as Observable<MessageEvent>;
  }

  @Get('conversations')
  async getConversations(
    @Query('userId') userId?: string,
    @Query('lastId') lastId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getConversations(userId || 'guest', lastId, limit);
  }

  @Get('history/:sessionId')
  async getHistory(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId?: string,
    @Query('firstId') firstId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getHistory(sessionId, userId || 'guest', firstId, limit);
  }

  @Delete('conversations/:sessionId')
  async deleteConversation(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId?: string,
  ) {
    return this.chatService.deleteConversation(sessionId, userId || 'guest');
  }
}
