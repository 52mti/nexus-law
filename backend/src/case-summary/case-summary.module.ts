import { Module } from '@nestjs/common';
import { CaseSummaryService } from './case-summary.service';
import { CaseSummaryController } from './case-summary.controller';

@Module({
  controllers: [CaseSummaryController],
  providers: [CaseSummaryService],
})
export class CaseSummaryModule {}
