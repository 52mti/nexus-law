import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagModule } from '../rag/rag.module';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [RagModule, OpenaiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
