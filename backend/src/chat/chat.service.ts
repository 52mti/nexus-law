// backend/src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor() {
    // 初始化 OpenAI 客户端
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // 🚀 核心魔法：返回一个可以持续发射数据的 Observable
  streamChat(prompt: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const stream = await this.openai.chat.completions.create({
            model: 'gpt-4o', // 或其他你想用的模型
            messages: [{ role: 'user', content: prompt }],
            stream: true, // 👈 开启流式输出
          });

          // 遍历 OpenAI 返回的数据流块
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // 按照 SSE 的标准格式，把数据 "next" 给客户端
              subscriber.next({ data: { content } });
            }
          }

          // 对话结束，关闭流
          subscriber.complete();
        } catch (error) {
          console.error('OpenAI 调用失败:', error);
          subscriber.error(error);
        }
      })().catch(console.error);
    });
  }
}
