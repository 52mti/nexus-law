import { Controller, Post, Body, Req, Sse } from '@nestjs/common';
import { DocumentService } from './document.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@Controller('api/document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * 文书生成 - 流式 SSE 响应
   * 前端使用 EventSource 或 fetch with ReadableStream 接收内容
   *
   * @param dto 文书生成参数
   * @param req 请求对象（用于获取用户信息）
   * @returns Observable 流式返回内容
   */
  @Post('generate')
  @Sse('generate')
  generate(@Body() dto: GenerateDocumentDto, @Req() req: any) {
    // 获取用户身份，如果没有从请求中提取，则使用 'guest'
    const user = req.user?.id || req.user?.username || 'guest';

    return this.documentService.generateLegalDocument(dto, user);
  }
}
