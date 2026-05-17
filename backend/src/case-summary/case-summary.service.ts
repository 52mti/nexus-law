import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../dify/dify.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';
import axios from 'axios';

// 🚀 1. 引入两员大将
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class CaseSummaryService {
  private readonly logger = new Logger(CaseSummaryService.name);

  constructor(private readonly difyService: DifyService) {}

  async summarize(dto: SummarizeCaseDto) {
    // 1. 📂 核心逻辑：遍历解析所有文件，将内容拼接起来
    let combinedCaseContent = '';

    for (const url of dto.fileUrls) {
      try {
        this.logger.log(`正在下载文件: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const originalname = url.split('/').pop() || 'file';

        const fileText = await this.extractTextFromFile(buffer, originalname);
        combinedCaseContent += `\n\n【文件名称】：${originalname}\n【文件内容】：\n${fileText}\n---`;
      } catch (error) {
        this.logger.error(`下载文件失败: ${url}`, error);
        combinedCaseContent += `\n\n【文件名称】：${url}\n【文件内容】：\n[系统提示：文件下载失败]\n---`;
      }
    }

    const inputs = {
      combinedCaseContent,
      remarks: dto.remarks || '',
    };

    this.logger.log(`开始快梳案件，共收到 ${dto.fileUrls.length} 份文件`);

    return this.difyService.generateMarkdown(
      inputs,
    );
  }

  /**
   * 🛠️ 核心升级：支持 PDF、Word(docx)、TXT 真实解析
   */
  private async extractTextFromFile(buffer: Buffer, originalname: string): Promise<string> {
    const extension = originalname.split('.').pop()?.toLowerCase() || '';

    try {
      let text = '';

      if (extension === 'pdf') {
        this.logger.log(`正在解析 PDF 文件: ${originalname}`);

        // 🚀 拥抱官方 V2 新版写法：实例化构造函数
        const parser = new PDFParse({ data: buffer });
        // 调用自带的 getText 方法获取文本
        const result = await parser.getText();
        text = result.text;
      } else if (extension === 'docx') {
        this.logger.log(`正在解析 Word 文件: ${originalname}`);
        const docxData = await mammoth.extractRawText({ buffer: buffer });
        text = docxData.value;
      } else if (['txt', 'csv', 'md'].includes(extension)) {
        text = buffer.toString('utf-8');
      } else {
        this.logger.warn(`暂不支持解析该文件格式: ${extension}`);
        return `[系统提示：不支持的附件格式 .${extension}，大模型无法读取其内容]`;
      }

      // 🧹 清理提取出来的文本（去掉过多连续的换行和空格，节省 Token）
      text = text.replace(/\n\s*\n/g, '\n').trim();

      const maxLength = 20000;
      if (text.length > maxLength) {
        return (
          text.substring(0, maxLength) +
          '\n\n... (系统提示：文件内容过长，为保证核心案情提取，已自动截断尾部内容)'
        );
      }

      return text;
    } catch (error) {
      this.logger.error(`文件解析彻底失败: ${originalname}`, error);
      return `[系统提示：文件 ${originalname} 解析失败或已损坏，无法读取]`;
    }
  }
}
