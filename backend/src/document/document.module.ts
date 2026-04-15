import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [ChatModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
