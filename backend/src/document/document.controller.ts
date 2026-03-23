import { Controller, Post, Body } from '@nestjs/common';
import { DocumentService } from './document.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@Controller('api/document') // 映射路径 /api/document
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateDocumentDto) {
    // 真实的业务里，这里你可能还需要获取 req.user.id 来扣减积分、保存历史记录
    // 今天我们先专注打通 AI 链路
    const result = await this.documentService.generateLegalDocument(dto);

    // 返回标准统一格式（根据你前端的 axios 拦截器习惯调整）
    return {
      code: 0,
      message: '生成成功',
      data: result,
    };
  }
}
