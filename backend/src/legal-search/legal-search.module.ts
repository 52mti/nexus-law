import { Module } from '@nestjs/common';
import { LegalSearchService } from './legal-search.service';
import { LegalSearchController } from './legal-search.controller';

@Module({
  controllers: [LegalSearchController],
  providers: [LegalSearchService],
})
export class LegalSearchModule {}
