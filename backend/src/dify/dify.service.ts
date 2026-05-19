import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import axios from 'axios';

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DIFY_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('DIFY_BASE_URL') ||
      'https://api.dify.ai/v1';
  }

  createChatStream(
    query: string,
    user?: string,
    conversationId?: string,
    userToken?: string,
    targetLanguage?: string,
  ): Observable<any> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      const body = {
        inputs: {
          user_token: userToken || '',
          target_language: targetLanguage || 'zh-CN',
        },
        query,
        user: user || 'guest',
        response_mode: 'streaming',
        conversation_id: conversationId || undefined,
      };

      axios
        .post(`${this.baseUrl}/chat-messages`, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
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
                      this.logger.log(
                        `[SSE] Detected new conversation ID: ${parsed.conversation_id}`,
                      );
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

  async getConversations(
    user: string,
    lastId?: string,
    limit: number = 20,
  ): Promise<any> {
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

  async getMessages(
    conversationId: string,
    user: string,
    firstId?: string,
    limit: number = 100,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/messages`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        params: {
          user,
          conversation_id: conversationId,
          first_id: firstId || undefined,
          limit,
        },
      });
      return response.data;
    } catch (e) {
      this.logger.error(
        `Failed to fetch Dify messages for ${conversationId}`,
        e,
      );
      throw e;
    }
  }

  async deleteConversation(conversationId: string, user: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          data: { user },
        },
      );
      return response.data;
    } catch (e) {
      this.logger.error(
        `Failed to delete Dify conversation ${conversationId}`,
        e,
      );
      throw e;
    }
  }

  /**
   * 调用 Dify API 进行内容生成（对话模式）
   * 用于替代 OpenaiService.generateLegalMarkdown()
   *
   * @param inputs 自定义参数
   * @param customApiKey 可选的自定义 API 密钥（用于多应用场景）
   * @param applicationType 应用类型
   * @returns 返回生成的 Markdown 格式字符串
   */
  generateMarkdown(
    inputs: Record<string, any>,
    customApiKey?: string,
    applicationType: 'chat' | 'completion' = 'completion',
    user: string = 'system',
  ): Observable<any> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();
      const apiKey = customApiKey || this.apiKey;

      this.logger.log(inputs);
      this.logger.log(`11${applicationType}11`);

      const body = {
        inputs,
        response_mode: 'streaming',
        user,
        query: applicationType === 'chat' ? '请开始分析' : '',
      };

      this.logger.log(
        `[Dify] Generating content (streaming) using ${customApiKey} API key`,
      );

      axios
        .post(`${this.baseUrl}/${applicationType}-messages`, body, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          signal: abortController.signal,
          timeout: 0,
        })
        .then((response) => {
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
                  if (
                    parsed.event === 'message' ||
                    parsed.event === 'agent_message'
                  ) {
                    if (parsed.answer && parsed.answer.length > 0) {
                      subscriber.next({
                        data: parsed.answer,
                      });
                    }
                  } else if (parsed.event === 'error') {
                    this.logger.error(`[Dify] Error event: ${parsed.message}`);
                    subscriber.next({ data: `[系统错误：${parsed.message}]` });
                    subscriber.complete();
                  }
                } catch (e) {
                  this.logger.debug(`[Dify] Failed to parse chunk: ${dataStr}`);
                }
              }
            }
          });

          response.data.on('end', () => {
            this.logger.log('[Dify] Stream ended normally');
            subscriber.complete();
          });

          response.data.on('error', (err) => {
            this.logger.error('[Dify] Stream error', err);
            subscriber.next({ data: `[系统错误：流传输异常]` });
            subscriber.complete();
          });
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            this.logger.log('[Dify] Request canceled');
          } else {
            this.logger.error('[Dify] Request failed', error);
            const errorMsg = error.response?.data?.message || error.message;
            subscriber.next({ data: `[系统错误：${errorMsg}]` });
            subscriber.complete();
          }
        });

      return () => {
        this.logger.log('[Dify] Aborting request');
        abortController.abort();
      };
    });
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
      target_language?: string;
    },
    user: string = 'guest',
    userToken?: string,
  ): Observable<any> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      const body = {
        inputs: {
          ...inputs,
          user_token: userToken || '',
        },
        response_mode: 'streaming',
        user,
      };

      this.logger.log(body);

      axios
        .post(`${this.baseUrl}/completion-messages`, body, {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('DIFY_DOCUMENT_KEY')}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          signal: abortController.signal,
          timeout: 0,
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
                      this.logger.log(
                        `[SSE] Detected new conversation ID: ${parsed.conversation_id}`,
                      );
                      subscriber.next({
                        type: 'session_id',
                        data: parsed.conversation_id,
                      });
                      firstChunk = false;
                    }

                    // 🚀 处理内容：只有当 answer 有实际文本时才发送
                    if (parsed.answer && parsed.answer.length > 0) {
                      subscriber.next({
                        data: parsed.answer,
                      });
                    }
                  } else if (parsed.event === 'error') {
                    this.logger.error(
                      `[Dify Document] Error event: ${parsed.message}`,
                    );
                    subscriber.error(new Error(parsed.message));
                  }
                } catch (e) {
                  this.logger.debug(
                    `[Dify Document] Failed to parse chunk: ${dataStr}`,
                  );
                }
              }
            }
          });

          response.data.on('end', () => {
            this.logger.log('[Dify Document] Stream ended normally');
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
