import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { CaseSearchService } from './case-search.service';
import { CaseSearchController } from './case-search.controller';

@Module({
  imports: [ChatModule],
  controllers: [CaseSearchController],
  providers: [CaseSearchService],
})
export class CaseSearchModule {}
