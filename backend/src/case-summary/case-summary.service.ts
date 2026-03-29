import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';

// 🚀 1. 引入两员大将
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class CaseSummaryService {
  private readonly logger = new Logger(CaseSummaryService.name);

  constructor(private readonly openaiService: OpenaiService) {}

  async summarize(files: Array<Express.Multer.File>, dto: SummarizeCaseDto) {
    // 1. 📂 核心逻辑：遍历解析所有文件，将内容拼接起来
    let combinedCaseContent = '';

    for (const file of files) {
      const fileText = await this.extractTextFromFile(file);
      combinedCaseContent += `\n\n【文件名称】：${file.originalname}\n【文件内容】：\n${fileText}\n---`;
    }

    // 2. 🧠 系统 Prompt（保持不变，依然是顶级法律专家人设）
    const systemPrompt = `你是一名具有十年诉讼经验的中国执业律师。
用户将输入多份案件材料（包括但不限于起诉状、证据清单、合同、微信聊天记录等）。你需要进行专业的案情快梳。
请按以下 Markdown 格式输出：
1. **争议焦点归纳**（一针见血地指出本案的核心争议点）
2. **法律关系梳理**（明确各方当事人之间的法律关系，如买卖合同、民间借贷、侵权关系等）
3. **关键事实时间轴**（将材料中提到的核心时间节点提取并按时间先后排序）
4. **初步诉讼/应对策略**（基于现有材料，为当事人提供初步的法律行动或补强证据建议）`;

    // 3. 📝 组装 User Prompt
    let userPrompt = `请对以下案件材料进行专业梳理：\n${combinedCaseContent}`;

    if (dto.remarks) {
      userPrompt += `\n\n【当事人额外补充说明】：${dto.remarks}\n请在梳理时重点关注此补充说明。`;
    }

    this.logger.log(`开始快梳案件，共收到 ${files.length} 份文件`);

    // 4. 调用大模型 (案情梳理需要推理，温度设为 0.3 比较合适)
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.3,
    );
  }

  /**
   * 🛠️ 核心升级：支持 PDF、Word(docx)、TXT 真实解析
   */
  private async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';

    try {
      let text = '';

      if (extension === 'pdf') {
        this.logger.log(`正在解析 PDF 文件: ${file.originalname}`);

        // 🚀 拥抱官方 V2 新版写法：实例化构造函数
        const parser = new PDFParse({ data: file.buffer });
        // 调用自带的 getText 方法获取文本（新版自带 TS 类型，不需要再写 as 断言了！）
        const result = await parser.getText();
        text = result.text;
      } else if (extension === 'docx') {
        this.logger.log(`正在解析 Word 文件: ${file.originalname}`);
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        text = docxData.value;
      } else if (['txt', 'csv', 'md'].includes(extension)) {
        text = file.buffer.toString('utf-8');
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
      this.logger.error(`文件解析彻底失败: ${file.originalname}`, error);
      return `[系统提示：文件 ${file.originalname} 解析失败或已损坏，无法读取]`;
    }
  }
}
