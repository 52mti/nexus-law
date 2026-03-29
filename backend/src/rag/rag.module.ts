import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeChunk } from '../database/entities/knowledge-chunk.entity';
import { RagService } from './rag.service';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeChunk]), OpenaiModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
