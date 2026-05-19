import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Sse,
  Headers,
} from '@nestjs/common';
import { CaseSummaryService } from './case-summary.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';

@Controller('api/case-summary')
export class CaseSummaryController {
  constructor(private readonly caseSummaryService: CaseSummaryService) {}

  @Post('analyze')
  @Sse('analyze')
  analyze(
    @Body() dto: SummarizeCaseDto,
    @Headers('target-language') targetLanguage: string,
  ) {
    if (!dto.fileUrls || dto.fileUrls.length === 0) {
      throw new BadRequestException('请至少提供一份案件材料的链接');
    }

    return this.caseSummaryService.summarize(dto, targetLanguage);
  }
}
