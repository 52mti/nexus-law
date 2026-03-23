// backend/src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  constructor(private readonly openaiService: OpenaiService) {}

  // 🚀 核心魔法：返回一个可以持续发射数据的 Observable
  streamChat(prompt: string, sessionId?: string): Observable<any> {
    return this.openaiService.createChatStream(prompt, sessionId);
  }
}
