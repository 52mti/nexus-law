import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import * as crypto from 'crypto';

// 🚀 LangChain 依赖
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TypeORMVectorStore } from '@langchain/community/vectorstores/typeorm';

// 🚀 LCEL 核心组件
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';

export interface RagChatStreamParams {
  // 1. 大模型角色设定
  systemPrompt: string;
  // 2. 用户的最新提问
  question: string;
  // 3. 历史问答记录
  history: { role: 'user' | 'assistant' | 'system'; content: string }[];
  // 4. 大模型温度
  temperature?: number;
  // 5. 标识当前对话的 ID
  sessionId?: string;
}

@Injectable()
export class OpenaiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);

  // LangChain 专属实例
  private readonly lcLlm: ChatOpenAI;
  private readonly lcEmbeddings: OpenAIEmbeddings;

  constructor(
    private configService: ConfigService,
    // 🚀 注入 TypeORM 的 DataSource
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL');

    // 1. 初始化原生 OpenAI 客户端
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    // 2. 初始化 LangChain 的大模型实例 (常规调用使用)
    this.lcLlm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'deepseek-chat',
      temperature: 0.1,
      configuration: { baseURL },
    });

    // 3. 初始化 LangChain 的向量化模型实例
    this.lcEmbeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-ada-002',
      configuration: { baseURL },
    });
  }

  // ==========================================
  // 🔥 终极方法：支持历史记忆 + RAG 检索 + 流式输出
  // ==========================================
  createRagChatStream(params: RagChatStreamParams): Observable<any> {
    const {
      systemPrompt,
      question,
      history = [],
      temperature = 0.1,
      sessionId,
    } = params;

    return new Observable((subscriber) => {
      (async () => {
        try {
          const currentSessionId = sessionId || crypto.randomUUID();
          // 第一时间将 session_id 发给前端
          subscriber.next({ type: 'session_id', data: currentSessionId });

          this.logger.log(`开始流式 RAG 流程，SessionID: ${currentSessionId}`);

          // 1. 初始化黑盒向量库与检索器
          const vectorStore = await TypeORMVectorStore.fromDataSource(
            this.lcEmbeddings,
            {
              postgresConnectionOptions: this.dataSource.options as any,
              tableName: 'langchain_documents',
            },
          );
          const retriever = vectorStore.asRetriever({ k: 4 });

          // 2. 检索相关法条/案例
          const retrievedDocs = await retriever.invoke(question);

          const contextText =
            retrievedDocs.length > 0
              ? retrievedDocs.map((doc) => doc.pageContent).join('\n\n---\n\n')
              : '暂无相关的参考资料。';

          // 🚀 核心 UX 优化：在打字机效果开始前，先把引用的来源发给前端，方便前端右侧高亮展示
          const sources = retrievedDocs.map((doc) => ({
            content: doc.pageContent,
            page: doc.metadata?.loc?.pageNumber || '未知',
            document: doc.metadata?.sourceName || '未知文档',
          }));
          subscriber.next({ type: 'sources', data: sources });

          // 3. 转换历史记录为 LangChain 标准 Message 对象
          const formattedHistory = history.map((msg) => {
            if (msg.role === 'user') return new HumanMessage(msg.content);
            if (msg.role === 'assistant') return new AIMessage(msg.content);
            return new SystemMessage(msg.content);
          });

          // 4. 构建包含动态历史记录的 PromptTemplate
          const prompt = ChatPromptTemplate.fromMessages([
            [
              'system',
              `${systemPrompt}
              
              严格根据以下【参考资料】作答。如果资料无关，请回答“根据现有资料无法解答”。
              
              【参考资料】：
              {context}`,
            ],
            // 使用 MessagesPlaceholder 动态插入多轮历史记录
            new MessagesPlaceholder('chat_history'),
            ['human', '{input}'],
          ]);

          // 5. 单独实例化一个支持流式的 ChatOpenAI 实例
          const streamLlm = new ChatOpenAI({
            openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
            modelName: 'deepseek-chat',
            configuration: {
              baseURL: this.configService.get<string>('OPENAI_BASE_URL'),
            },
            temperature: temperature,
          });

          // 6. 组装 LCEL 流水线链条
          const chain = prompt.pipe(streamLlm).pipe(new StringOutputParser());

          // 7. 触发流式调用
          const stream = await chain.stream({
            context: contextText,
            chat_history: formattedHistory,
            input: question,
          });

          // 8. 遍历流式数据块，并通过 Observable 吐给前端
          for await (const chunk of stream) {
            if (chunk) {
              subscriber.next({ data: chunk });
            }
          }

          subscriber.complete();
        } catch (error) {
          this.logger.error('流式 RAG 调用失败:', error);
          subscriber.error(error);
        }
      })();
    });
  }

  // ==========================================
  // 流式对话机制 (无记忆、无 RAG，原生 OpenAI 实现)
  // ==========================================
  createChatStream(messages: any[], sessionId?: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const currentSessionId = sessionId || crypto.randomUUID();
          subscriber.next({ type: 'session_id', data: currentSessionId });

          const stream = await this.openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              subscriber.next({ data: content });
            }
          }

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
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI 调用失败', error);
      throw new InternalServerErrorException('AI 引擎暂时开小差了，请稍后再试');
    }
  }

  // ==========================================
  // 🚀 RAG 核心一：自动建表、解析、入库
  // ==========================================
  async initKnowledgeBase(
    pdfFilePath: string,
    documentName: string,
  ): Promise<void> {
    try {
      this.logger.log(`开始处理并入库: ${pdfFilePath}`);

      const loader = new PDFLoader(pdfFilePath);
      const docs = await loader.load();

      const docsWithMetadata = docs.map((doc) => {
        doc.metadata = { ...doc.metadata, sourceName: documentName };
        return doc;
      });

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 150,
      });
      const splitDocs = await splitter.splitDocuments(docsWithMetadata);

      await TypeORMVectorStore.fromDocuments(splitDocs, this.lcEmbeddings, {
        postgresConnectionOptions: this.dataSource.options as any,
        tableName: 'langchain_documents',
      });

      this.logger.log(
        `成功将 ${splitDocs.length} 个知识块存入 LangChain 黑盒数据库。`,
      );
    } catch (error) {
      this.logger.error('文档入库失败', error);
      throw new InternalServerErrorException('知识库文档处理失败');
    }
  }

  // ==========================================
  // 🚀 RAG 核心二：最新 LCEL (表达式语言) 架构 - 单轮阻塞式
  // ==========================================
  async askWithKnowledgeBase(
    question: string,
  ): Promise<{ answer: string; sources: any[] }> {
    try {
      this.logger.log(`接收到问题，开始 LCEL 架构 RAG 流程: ${question}`);

      const vectorStore = await TypeORMVectorStore.fromDataSource(
        this.lcEmbeddings,
        {
          postgresConnectionOptions: this.dataSource.options as any,
          tableName: 'langchain_documents',
        },
      );
      const retriever = vectorStore.asRetriever({ k: 4 });

      const retrievedDocs = await retriever.invoke(question);

      if (!retrievedDocs || retrievedDocs.length === 0) {
        return { answer: '未在知识库中找到相关法条/资料。', sources: [] };
      }

      const contextText = retrievedDocs
        .map((doc) => doc.pageContent)
        .join('\n\n---\n\n');

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `你是一位顶尖的中国执业律师。请严格根据以下【案卷资料/参考法条】回答问题。
        如果资料中没有相关信息，请明确回答“根据现有资料无法解答”，绝对不要自行编造。
        
        【案卷资料/参考法条】：
        {context}`,
        ],
        ['human', '{input}'],
      ]);

      const chain = prompt.pipe(this.lcLlm).pipe(new StringOutputParser());

      const answer = await chain.invoke({
        context: contextText,
        input: question,
      });

      return {
        answer: answer,
        sources: retrievedDocs.map((doc) => ({
          content: doc.pageContent,
          page: doc.metadata?.loc?.pageNumber || '未知',
          document: doc.metadata?.sourceName || '未知文档',
        })),
      };
    } catch (error) {
      this.logger.error('RAG 检索失败', error);
      throw new InternalServerErrorException('数据库检索分析失败');
    }
  }
}
