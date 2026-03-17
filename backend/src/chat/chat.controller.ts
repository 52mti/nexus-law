// backend/src/chat/chat.controller.ts
import { Controller, Post, Body, Sse, Get } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 💡 注意：这里用 Post 接收复杂的对话上下文，用 @Sse 标记流式返回
  @Post('stream')
  @Sse()
  streamChat(@Body('prompt') prompt: string): Observable<any> {
    return this.chatService.streamChat(prompt);
  }

  @Get()
  findAll() {
    return [];
  }
}
