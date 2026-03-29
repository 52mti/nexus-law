import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../database/entities/knowledge-chunk.entity';
import { OpenaiService } from '../openai/openai.service';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeChunkRepo: Repository<KnowledgeChunk>,
    private readonly openaiService: OpenaiService,
  ) {}

  /**
   * 录入纯文本知识，返回存储后的实体
   */
  async addDocument(content: string, metadata: any = {}): Promise<KnowledgeChunk> {
    const embedding = await this.openaiService.createEmbedding(content);
    // pgvector 要求的字符串插入格式: '[1.1, 2.2, 3.3]'
    const strEmbedding = `[${embedding.join(',')}]`;

    const chunk = this.knowledgeChunkRepo.create({
      content,
      metadata,
      embedding: strEmbedding,
    });
    return this.knowledgeChunkRepo.save(chunk);
  }

  /**
   * 执行向量相似度检索 (Cosine Distance) 取 Top K 个最相似的结果
   */
  async searchContext(query: string, limit: number = 3): Promise<KnowledgeChunk[]> {
    try {
      const queryEmbedding = await this.openaiService.createEmbedding(query);
      const strQuery = `[${queryEmbedding.join(',')}]`;

      // 使用 <=> 计算余弦距离排序 (数值越小代表越相似)
      return await this.knowledgeChunkRepo
        .createQueryBuilder('chunk')
        .orderBy(`embedding <=> :queryVector`, 'ASC')
        .setParameter('queryVector', strQuery)
        .limit(limit)
        .getMany();
    } catch (error) {
      this.logger.error('RAG 查询失败，可能是 pgvector 尚未正确启动或没有对应索引:', error);
      return []; // 如果发生错误，起码不要让查询整个挂掉，优雅降级返回空
    }
  }
}
