import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Sse,
  Headers,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';

@Controller('api/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('analyze')
  @Sse('analyze')
  analyze(
    @Body() dto: AnalyzeComplianceDto,
    @Headers('target-language') targetLanguage: string,
  ) {
    if (!dto.fileUrls || dto.fileUrls.length === 0) {
      throw new BadRequestException('请至少提供一份合同或协议资料的链接');
    }

    return this.complianceService.analyze(dto, targetLanguage);
  }
}
