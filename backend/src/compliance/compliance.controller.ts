import { Controller, Post, Body } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';

@Controller('api/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('analyze')
  async analyze(@Body() dto: AnalyzeComplianceDto) {
    // 未来在这里加 req.user.id 扣积分、存历史
    const result = await this.complianceService.analyze(dto);

    return {
      code: 0,
      message: '合规审查完成',
      data: result,
    };
  }
}
