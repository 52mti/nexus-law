// backend/src/chat/chat.controller.ts
import { Controller, Post, Body, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @Sse('stream')
  stream(
    @Body('prompt') prompt: string,
    @Body('sessionId') sessionId?: string, // 🚀 接收前端传来的 sessionId
  ): Observable<MessageEvent> {
    // 传入 service
    return this.chatService.streamChat(
      prompt,
      sessionId,
    ) as Observable<MessageEvent>;
  }
}
