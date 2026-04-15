import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { CaseSummaryService } from './case-summary.service';
import { CaseSummaryController } from './case-summary.controller';

@Module({
  imports: [ChatModule],
  controllers: [CaseSummaryController],
  providers: [CaseSummaryService],
})
export class CaseSummaryModule {}
