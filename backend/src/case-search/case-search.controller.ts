import { Controller, Post, Body, Sse } from '@nestjs/common';
import { CaseSearchService } from './case-search.service';
import { SearchCaseDto } from './dto/search-case.dto';

@Controller('api/case-search')
export class CaseSearchController {
  constructor(private readonly caseSearchService: CaseSearchService) {}

  @Post('search')
  @Sse('search')
  search(@Body() dto: SearchCaseDto) {
    return this.caseSearchService.search(dto);
  }
}
