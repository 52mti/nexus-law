import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DifyService } from '../dify/dify.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

// 引入文件解析双雄
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly difyService: DifyService,
    private readonly configService: ConfigService,
<<<<<<< HEAD
  ) { }
=======
  ) {}
>>>>>>> 10c5d20248a613b762d49541fccba08a350feb15

  async analyze(dto: AnalyzeComplianceDto, targetLanguage?: string) {
    // 1. 📂 提取所有文件内容
    let combinedContent = '';
    for (const url of dto.fileUrls) {
      try {
        this.logger.log(`正在下载文件: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const originalname = url.split('/').pop() || 'file';

        const fileText = await this.extractTextFromFile(buffer, originalname);
        combinedContent += `\n\n【文件名称】：${originalname}\n【合同/协议内容】：\n${fileText}\n---`;
      } catch (error) {
        this.logger.error(`下载文件失败: ${url}`, error);
        combinedContent += `\n\n【文件名称】：${url}\n【合同/协议内容】：\n[系统提示：文件下载失败]\n---`;
      }
    }

    // 2. ⚖️ 动态立场映射映射
    const angleMap: Record<string, string> = {
      partyA: '甲方（通常为提供产品、发包方或资金优势方）',
      partyB: '乙方（通常为提供服务、承包方或弱势方）',
      neutral: '中立第三方（法官或合规审查专员）',
    };
    const currentAngle = angleMap[dto.reviewAngle] || angleMap.neutral;

    const inputs = {
      reviewAngle: currentAngle,
      combinedContent,
      application_type: 'compliance_review',
      target_language: targetLanguage || 'zh-CN',
    };

    this.logger.log(
      `开始合规审查，视角：${currentAngle}，共收到 ${dto.fileUrls.length} 份文件`,
    );

<<<<<<< HEAD
    // 4. 合规审查需要极度严谨，温度设为较低的 0.1 或 0.2
    return await this.difyService.generateMarkdown(
      systemPrompt,
      userPrompt,
      0.1,
      this.configService.get<string>('DIFY_COMPLIANCE_KEY'),
=======
    return this.difyService.generateMarkdown(
      inputs,
      this.configService.get<string>('DIFY_REVIEW'),
      'chat',
>>>>>>> 10c5d20248a613b762d49541fccba08a350feb15
    );
  }

  /**
   * 🛠️ 直接复用我们完美打磨过的多文件解析方法
   */
  private async extractTextFromFile(
    buffer: Buffer,
    originalname: string,
  ): Promise<string> {
    const extension = originalname.split('.').pop()?.toLowerCase() || '';

    try {
      let text = '';

      if (extension === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text;
      } else if (extension === 'docx') {
        const docxData = await mammoth.extractRawText({ buffer: buffer });
        text = docxData.value;
      } else if (['txt', 'csv', 'md'].includes(extension)) {
        text = buffer.toString('utf-8');
      } else {
        return `[系统提示：不支持的格式 .${extension}]`;
      }

      text = text.replace(/\n\s*\n/g, '\n').trim();

      const maxLength = 20000;
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + '\n\n... (内容过长，自动截断)';
      }

      return text;
    } catch (error) {
      this.logger.error(`文件解析失败: ${originalname}`, error);
      return `[系统提示：文件解析失败]`;
    }
  }
}
