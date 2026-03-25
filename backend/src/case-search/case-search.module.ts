import { Module } from '@nestjs/common';
import { CaseSearchService } from './case-search.service';
import { CaseSearchController } from './case-search.controller';

@Module({
  controllers: [CaseSearchController],
  providers: [CaseSearchService],
})
export class CaseSearchModule {}
