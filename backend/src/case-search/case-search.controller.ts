import { Controller, Post, Body } from '@nestjs/common';
import { CaseSearchService } from './case-search.service';
import { SearchCaseDto } from './dto/search-case.dto';

@Controller('api/case-search')
export class CaseSearchController {
  constructor(private readonly caseSearchService: CaseSearchService) {}

  @Post('search')
  async search(@Body() dto: SearchCaseDto) {
    const result = await this.caseSearchService.search(dto);
    return {
      code: 0,
      message: '类案分析完成',
      data: result,
    };
  }
}
