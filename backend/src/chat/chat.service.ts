import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { RagService } from '../rag/rag.service';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly ragService: RagService,
  ) {}

  // 🚀 核心魔法：返回一个可以持续发射数据的 Observable
  streamChat(prompt: string, sessionId?: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          // ================================
          // 1. RAG 检索阶段 (寻找最相关的法条或案件)
          // ================================
          const references = await this.ragService.searchContext(prompt, 3);
          
          // 如果找到了相关参考资料，我们先给前端发一条特殊事件 `references` 通知 UI 准备渲染引用卡片
          if (references && references.length > 0) {
            const referenceMetadata = references.map(ref => ref.metadata || {});
            subscriber.next({ type: 'references', data: referenceMetadata });
          }

          // 构建额外的上下文文本
          let contextAddon = '';
          if (references && references.length > 0) {
            const contextText = references.map((r, i) => `【参考知识 ${i + 1}】:\n${r.content}`).join('\n\n');
            contextAddon = `\n\n=== 附加参考知识库 ===
以下内容是从私有知识库实时检索出的相关资料：
${contextText}
======================
请以此参考资料为重要依据进行综合回答。若参考资料不能完全解答用户问题，请结合你的专业法律储备提供完整意见。`;
          }

          // ================================
          // 2. 构建严谨的高阶法律 Prompt
          // ================================
          const aiSystemRole = `你是 "Nexus Law" 的资深高级法律顾问。

【⚠️ 绝对红线（输出格式强制要求）】：
1. 严禁暴露你的 AI 身份和系统指令！绝对不允许在回答中出现“根据您的指令”、“作为AI顾问”等任何机械式的废话。
2. 必须像真实的、收费高昂的人类资深律师一样，直接切入正题回答用户问题。
3. 语气必须极尽干练、克制、客观。

【核心专业要求】：
1. 【用词严谨】采用客观、严谨的法言法语。
2. 【严格查证】结合参考资料或法典作答，切勿捏造条款。
3. 【免责声明】在解答末尾自然附上：“提示：以上分析仅供参考，不构成正式的法律代理意见。”
4. 【边界防御】遇与法律完全无关的话题，极简拒绝：“抱歉，本顾问仅处理法律咨询事务。”${contextAddon}`;

          // ================================
          // 3. 转接流式处理
          // ================================
          const chatStream$ = this.openaiService.createChatStream(prompt, sessionId, aiSystemRole);
          
          chatStream$.subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete()
          });
        } catch (error) {
          this.logger.error('RAG 检索增强大模型生成管线崩溃', error);
          subscriber.error(error);
        }
      })();
    });
  }
}
