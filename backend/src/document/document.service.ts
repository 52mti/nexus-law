import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../chat/dify.service'; // 引入我们之前封装的全局 AI 服务
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DOCUMENT_SYSTEM_PROMPTS } from './constants/document-prompts.constant';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(private readonly difyService: DifyService) {}

  async generateLegalDocument(dto: GenerateDocumentDto) {
    // 1. 根据前端传来的文书类别，匹配对应的 System Prompt，匹配不到就用默认的
    const systemPrompt =
      DOCUMENT_SYSTEM_PROMPTS[dto.category] || DOCUMENT_SYSTEM_PROMPTS.DEFAULT;

    // 2. 拼装用户的输入 User Prompt
    const userPrompt = `
      【所需文书分类】：${dto.category} / 小类：${dto.docType || '未指定'}
      【甲方（原告/出租方等）信息】：${dto.partyA || '未提供'}
      【乙方（被告/承租方等）信息】：${dto.partyB || '未提供'}
      【核心事实与诉求描述】：\n${dto.content}
    `.trim();

    this.logger.log(`开始生成文书，分类: ${dto.category}`);

    // 3. 调用大模型 (传入系统人设、用户输入，温度设为 0.2 保证严谨不胡编)
    const markdownResult = await this.difyService.generateMarkdown(
      systemPrompt,
      userPrompt,
      0.2,
    );

    // 4. 解析结果：前端需要 { title, markdownContent } 格式
    return this.parseMarkdownResult(markdownResult);
  }

  findAll() {
    return `This action returns all document`;
  }

  findOne(id: number) {
    return `This action returns a #${id} document`;
  }

  update(id: number, updateDocumentDto: UpdateDocumentDto) {
    return `This action updates a #${id} document`;
  }

  remove(id: number) {
    return `This action removes a #${id} document`;
  }

  /**
   * 工具方法：从 AI 返回的 Markdown 中提取标题
   */
  private parseMarkdownResult(rawMarkdown: string) {
    const lines = rawMarkdown.split('\n');
    let title = '法律文书';

    // 寻找第一行以 # 开头的一级标题作为文档 Title
    const titleLineIndex = lines.findIndex((line) =>
      line.trim().startsWith('# '),
    );
    if (titleLineIndex !== -1) {
      // 提取标题并去掉 '# ' 符号
      title = lines[titleLineIndex].replace(/^#\s+/, '').trim();
    }

    return {
      title,
      markdownContent: rawMarkdown.trim(),
    };
  }
}
