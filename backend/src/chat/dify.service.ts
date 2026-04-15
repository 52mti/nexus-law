import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import axios from 'axios';

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.dify.ai/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DIFY_KEY') || '';
  }

  createChatStream(query: string, user?: string, conversationId?: string): Observable<any> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      const body = {
        inputs: {},
        query,
        user: user || 'guest',
        response_mode: 'streaming',
        conversation_id: conversationId || '',
      };

      this.logger.log(`[Axios] Sending query to Dify: ${query} (User: ${body.user}, Conv: ${body.conversation_id})`);

      axios.post(`${this.baseUrl}/chat-messages`, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        signal: abortController.signal,
        timeout: 0, // 💡 禁用超时，由流自身控制
      })
        .then((response) => {
          let firstChunk = true;
          let buffer = '';

          response.data.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ')) {
                const dataStr = trimmedLine.slice(6);
                if (dataStr === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.event === 'message') {
                    // 🚀 处理 Session ID：如果是新会话且尚未通知前端 ID
                    if (firstChunk && parsed.conversation_id) {
                      this.logger.log(`[SSE] Detected new conversation ID: ${parsed.conversation_id}`);
                      subscriber.next({
                        type: 'session_id', // ⚠️ 这里必须是 type，NestJS 会将其映射为 SSE 的 event 字段
                        data: parsed.conversation_id,
                      });
                      firstChunk = false; // 标记已处理 ID
                    }

                    // 🚀 处理回答内容：只有当 answer 有实际文本时才发送
                    if (parsed.answer && parsed.answer.length > 0) {
                      subscriber.next({
                        data: parsed.answer,
                      });
                    }
                  } else if (parsed.event === 'error') {
                    this.logger.error(`Dify error event: ${parsed.message}`);
                    subscriber.error(new Error(parsed.message));
                  }
                } catch (e) {
                  this.logger.debug(`Failed to parse chunk: ${dataStr}`);
                }
              }
            }
          });

          response.data.on('end', () => {
            this.logger.log('[Axios] Dify stream ended normally');
            subscriber.complete();
          });

          response.data.on('error', (err) => {
            this.logger.error('[Axios] Dify stream internal error', err);
            subscriber.error(err);
          });
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            this.logger.log('[Axios] Dify request canceled');
          } else {
            this.logger.error('[Axios] Dify request failed', error);
            subscriber.error(error);
          }
        });

      return () => {
        this.logger.log('[Axios] Aborting request...');
        abortController.abort();
      };
    });
  }

  async getConversations(user: string, lastId?: string, limit: number = 20): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/conversations`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        params: { user, last_id: lastId || undefined, limit },
      });
      return response.data;
    } catch (e) {
      this.logger.error('Failed to fetch Dify conversations', e);
      throw e;
    }
  }

  async getMessages(conversationId: string, user: string, firstId?: string, limit: number = 100): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/messages`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        params: { user, conversation_id: conversationId, first_id: firstId || undefined, limit },
      });
      return response.data;
    } catch (e) {
      this.logger.error(`Failed to fetch Dify messages for ${conversationId}`, e);
      throw e;
    }
  }

  async deleteConversation(conversationId: string, user: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.baseUrl}/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: { user },
      });
      return response.data;
    } catch (e) {
      this.logger.error(`Failed to delete Dify conversation ${conversationId}`, e);
      throw e;
    }
  }

  /**
   * 调用 Dify API 进行内容生成（非对话模式）
   * 用于替代 OpenaiService.generateLegalMarkdown()
   *
   * @param systemPrompt 系统设定（角色定义、输出格式要求）
   * @param userPrompt 用户输入（具体案情、条件等）
   * @param temperature 创意度温度值（0.1-0.3，越低越严谨）
   * @returns 返回生成的 Markdown 格式字符串
   */
  async generateMarkdown(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2,
  ): Promise<string> {
    try {
      // 组合系统提示词和用户输入
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const body = {
        inputs: {
          // 可以通过 inputs 传递额外参数，如温度设置
          temperature: Math.min(Math.max(temperature, 0), 2), // Dify 温度范围 0-2
        },
        query: fullPrompt,
        user: 'system',
        response_mode: 'blocking', // 非流式模式，等待完整响应
      };

      this.logger.log(`[Dify] Generating content with temperature: ${temperature}`);

      const response = await axios.post(`${this.baseUrl}/chat-messages`, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 秒超时
      });

      // 从响应中提取答案
      if (response.data && response.data.answer) {
        this.logger.log('[Dify] Content generated successfully');
        return response.data.answer;
      }

      // 如果响应格式不同，尝试其他常见格式
      if (response.data && response.data.text) {
        return response.data.text;
      }

      this.logger.warn('[Dify] Unexpected response format', response.data);
      throw new Error('Unexpected Dify API response format');
    } catch (error) {
      this.logger.error('[Dify] Content generation failed', error);
      throw error;
    }
  }
}
