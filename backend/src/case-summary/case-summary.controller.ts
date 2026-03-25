import { Controller, Post, Body } from '@nestjs/common';
import { CaseSummaryService } from './case-summary.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';

@Controller('api/case-summary')
export class CaseSummaryController {
  constructor(private readonly caseSummaryService: CaseSummaryService) {}

  @Post('analyze')
  async analyze(@Body() dto: SummarizeCaseDto) {
    const result = await this.caseSummaryService.summarize(dto);
    return {
      code: 0,
      message: '案情快梳完成',
      data: result,
    };
  }
}
