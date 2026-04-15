import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { LegalSearchService } from './legal-search.service';
import { LegalSearchController } from './legal-search.controller';

@Module({
  imports: [ChatModule],
  controllers: [LegalSearchController],
  providers: [LegalSearchService],
})
export class LegalSearchModule {}
