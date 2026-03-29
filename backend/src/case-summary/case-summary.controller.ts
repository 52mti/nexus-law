import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CaseSummaryService } from './case-summary.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';

@Controller('api/case-summary')
export class CaseSummaryController {
  constructor(private readonly caseSummaryService: CaseSummaryService) {}

  @Post('analyze')
  // 🚀 核心：使用 FilesInterceptor 接收名为 'files' 的文件数组，最大限制 10 个文件
  @UseInterceptors(FilesInterceptor('files', 10))
  async analyze(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() dto: SummarizeCaseDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请至少上传一份案件材料（起诉状、证据等）');
    }

    const result = await this.caseSummaryService.summarize(files, dto);

    return {
      code: 0,
      message: '案情快梳完成',
      data: result,
    };
  }
}
