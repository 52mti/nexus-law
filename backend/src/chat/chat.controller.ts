// backend/src/chat/chat.controller.ts
import { Controller, Post, Body, Sse, MessageEvent, Get, Query, Param, Delete, Headers } from '@nestjs/common';
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
    @Headers('authorization') auth?: string,
  ): Observable<MessageEvent> {
    // 提取 Bearer Token 用于 Dify 内部回调（如 HTTP 节点）
    const userToken = auth?.replace('Bearer ', '');

    return this.chatService.streamChat(
      prompt,
      sessionId,
      userId,
      userToken,
    ) as Observable<MessageEvent>;
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
}
