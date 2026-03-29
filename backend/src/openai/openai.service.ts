import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class OpenaiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);

  constructor(private configService: ConfigService) {
    // 1. 初始化 OpenAI 客户端
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('OPENAI_BASE_URL'),
    });
  }

  // ==========================================
  // 🚀 改造入参：直接接收外部组装好的 messages 数组
  // ==========================================
  createChatStream(messages: any[], sessionId?: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          // 1. 生成或复用 Session ID（前端现在会传自己生成的 UUID 过来）
          const currentSessionId = sessionId || crypto.randomUUID();

          // 2. 告诉前端当前的 Session ID（保留这个机制，作为前端的兜底保障）
          subscriber.next({ type: 'session_id', data: currentSessionId });

          // 🚀 3. 开始大模型流式调用（直接透传 messages）
          const stream = await this.openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages, // 👈 核心变化：直接把上层拼好的包含 System 和多轮对话的数组塞进来
            stream: true,
          });

          // 遍历 OpenAI 吐出来的数据块
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              subscriber.next({ data: content });
            }
          }

          // 对话结束，关闭水龙头
          subscriber.complete();
        } catch (error) {
          this.logger.error('流式调用失败:', error);
          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * 核心生成方法：专为法律业务定制
   * @param systemPrompt 系统设定（用于规定身份和输出格式）
   * @param userPrompt 用户具体的案情或输入
   * @param temperature 创造力温度（法律业务建议设低，如 0.2）
   * @returns 返回纯正的 Markdown 字符串
   */
  async generateLegalMarkdown(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2,
  ): Promise<string> {
    try {
      this.logger.log(`正在调用大模型，设定温度: ${temperature}`);

      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        temperature: temperature,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\n⚠️ 重要要求：请直接输出 Markdown 格式正文，不要包含 \`\`\`markdown 这类代码块包裹符，也不要说“好的”、“这是您的文书”等废话。`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const result = response.choices[0].message.content;

      if (!result) {
        throw new Error('OpenAI 返回内容为空');
      }

      return result;
    } catch (error) {
      this.logger.error('OpenAI 调用失败', error);
      throw new InternalServerErrorException('AI 引擎暂时开小差了，请稍后再试');
    }
  }

  /**
   * 生成文本向量 (Embeddings)
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('获取文本向量失败', error);
      throw new InternalServerErrorException('向量化文本失败，请检查模型名称和配置是否正确支持。');
    }
  }
}