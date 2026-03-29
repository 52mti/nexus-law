import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ComplianceService } from './compliance.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';

@Controller('api/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('analyze')
  @UseInterceptors(FilesInterceptor('files', 10)) // 同样支持最多 10 个文件
  async analyze(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() dto: AnalyzeComplianceDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请至少上传一份合同或协议资料');
    }

    const result = await this.complianceService.analyze(files, dto);

    return {
      code: 0,
      message: '合规审查完成',
      data: result,
    };
  }
}
