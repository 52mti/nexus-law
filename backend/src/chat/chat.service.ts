import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../dify/dify.service';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly difyService: DifyService) {}

  streamChat(prompt: string, sessionId?: string, userId?: string, userToken?: string): Observable<any> {
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
          userToken,
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

  /**
   * 获取会话历史记录
   */
  async getHistory(sessionId: string, userId: string, firstId?: string, limit?: number) {
    return this.difyService.getMessages(sessionId, userId, firstId, limit);
  }
}
