import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', comment: '文档的文本片段内容' })
  content: string;

  @Column({ type: 'jsonb', nullable: true, comment: '附加元数据(如来源文档名称、作者、标题等)' })
  metadata: any;

  // 使用 pgvector 扩展自带的 vector 类型，配合 OpenAI 通常设置为主流维度 1536
  @Column({ type: 'vector', length: 1536, comment: '文本分块对应的向量(1536维)' })
  embedding: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
