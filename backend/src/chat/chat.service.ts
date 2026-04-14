import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from './dify.service';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly difyService: DifyService) {}

  streamChat(prompt: string, sessionId?: string, userId?: string): Observable<any> {
    return new Observable((subscriber) => {
      try {
        if (!prompt) {
          subscriber.error(new Error('No query found in prompt'));
          return;
        }

        // 转接 Dify 流式处理
        const chatStream$ = this.difyService.createChatStream(
          prompt,
          userId,
          sessionId,
        );

        chatStream$.subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      } catch (error) {
        this.logger.error('Dify 接口调用失败', error);
        subscriber.error(error);
      }
    });
  }

  async getConversations(userId: string, lastId?: string, limit?: number) {
    return this.difyService.getConversations(userId, lastId, limit);
  }

  async getHistory(sessionId: string, userId: string, firstId?: string, limit?: number) {
    return this.difyService.getMessages(sessionId, userId, firstId, limit);
  }

  async deleteConversation(sessionId: string, userId: string) {
    return this.difyService.deleteConversation(sessionId, userId);
  }
}
