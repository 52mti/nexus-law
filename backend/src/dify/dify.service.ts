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
   * 调用 Dify API 进行内容生成（对话模式）
   * 用于替代 OpenaiService.generateLegalMarkdown()
   *
   * @param systemPrompt 系统设定（角色定义、输出格式要求）
   * @param userPrompt 用户输入（具体案情、条件等）
   * @param temperature 创意度温度值（0.1-0.3，越低越严谨）
   * @param customApiKey 可选的自定义 API 密钥（用于多应用场景）
   * @returns 返回生成的 Markdown 格式字符串
   */
  async generateMarkdown(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2,
    customApiKey?: string,
  ): Promise<string> {
    try {
      // 组合系统提示词和用户输入
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // 使用自定义密钥或默认密钥
      const apiKey = customApiKey || this.apiKey;

      const body = {
        inputs: {
          // 可以通过 inputs 传递额外参数，如温度设置
          temperature: Math.min(Math.max(temperature, 0), 2), // Dify 温度范围 0-2
        },
        query: fullPrompt,
        user: 'system',
        response_mode: 'blocking', // 非流式模式，等待完整响应
      };

      this.logger.log(`[Dify] Generating content with temperature: ${temperature}, using ${customApiKey ? 'custom' : 'default'} API key`);

      const response = await axios.post(`${this.baseUrl}/chat-messages`, body, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

  /**
   * 文书生成流式 API - 使用 Dify 平台定义的系统提示词
   * 接收结构化的文书参数，通过 inputs 对象传递给 Dify
   *
   * @param inputs 结构化输入参数 { scene, document_type, party_a, party_b, content_desc }
   * @param user 用户身份
   * @returns Observable 流式返回内容
   */
  generateDocumentStream(
    inputs: {
      scene: string;
      document_type: string;
      party_a: string;
      party_b: string;
      content_desc: string;
    },
    user: string = 'guest',
  ): Observable<any> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      const body = {
        inputs, // 💡 直接传入结构化参数，由 Dify 平台的系统提示词处理
        query: '请开始生成文书内容', // 必须要加的参数以应对 400 错误
        response_mode: 'streaming',
        user,
      };

      axios.post(`${this.baseUrl}/completion-messages`, body, {
        headers: {
          'Authorization': `Bearer ${this.configService.get<string>('DIFY_DOCUMENT_KEY')}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        signal: abortController.signal,
        timeout: 0,
      })
        .then((response) => {
          let buffer = '';
          let fullContent = ''; // 📝 累积完整内容用于最后返回完整的 markdown

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
                  if (parsed.event === 'message' && parsed.answer) {
                    // 🚀 实时流式发送内容
                    fullContent += parsed.answer;
                    subscriber.next({
                      type: 'content',
                      data: parsed.answer,
                    });
                  } else if (parsed.event === 'message_end') {
                    // 📋 消息结束，返回完整内容用于前端解析
                    subscriber.next({
                      type: 'complete',
                      data: fullContent,
                    });
                  } else if (parsed.event === 'error') {
                    this.logger.error(`[Dify Document] Error event: ${parsed.message}`);
                    subscriber.error(new Error(parsed.message));
                  }
                } catch (e) {
                  this.logger.debug(`[Dify Document] Failed to parse chunk: ${dataStr}`);
                }
              }
            }
          });

          response.data.on('end', () => {
            this.logger.log('[Dify Document] Stream ended');
            subscriber.complete();
          });

          response.data.on('error', (err) => {
            this.logger.error('[Dify Document] Stream error', err);
            subscriber.error(err);
          });
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            this.logger.log('[Dify Document] Request canceled');
          } else {
            this.logger.error('[Dify Document] Request failed', error);
            // 这里加入更详细的错误捕获以方便调试
            if (error.response?.data) {
                this.logger.error(`[Dify Document] Error Data: ${JSON.stringify(error.response.data)}`);
            }
            subscriber.error(error);
          }
        });

      return () => {
        this.logger.log('[Dify Document] Aborting request');
        abortController.abort();
      };
    });
  }
}
