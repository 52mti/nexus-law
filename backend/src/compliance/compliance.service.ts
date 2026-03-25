import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';

// 引入文件解析双雄
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

// 🚀 保持纯净：继续沿用我们自己定义的类型，防 ESLint 报错
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly openaiService: OpenaiService) {}

  async analyze(files: Array<MulterFile>, dto: AnalyzeComplianceDto) {
    // 1. 📂 提取所有文件内容
    let combinedContent = '';
    for (const file of files) {
      const fileText = await this.extractTextFromFile(file);
      combinedContent += `\n\n【文件名称】：${file.originalname}\n【合同/协议内容】：\n${fileText}\n---`;
    }

    // 2. ⚖️ 动态立场映射映射
    const angleMap: Record<string, string> = {
      partyA: '甲方（通常为提供产品、发包方或资金优势方）',
      partyB: '乙方（通常为提供服务、承包方或弱势方）',
      neutral: '中立第三方（法官或合规审查专员）',
    };
    const currentAngle = angleMap[dto.reviewAngle] || angleMap.neutral;

    // 3. 🧠 注入灵魂提示词：明确让 AI “偏心”
    const systemPrompt = `你是一名资深的中国商事合规风控律师。
现在的审查视角是：**基于【${currentAngle}】的利益立场**。
你需要对用户提供的合同、协议或商业资料进行合规审查。如果你的立场是甲/乙方，请最大化挖掘出损害己方利益、责任不对等的条款；如果你的立场是中立，请客观指出双方违法违规及不对等之处。
请按以下 Markdown 格式严格输出：
1. **核心合规风险提示**（直接指出最致命的法律漏洞，特别是针对己方的不利条款）
2. **风险等级评估**（明确指出是 高/中/低 风险，并说明理由）
3. **权利义务不对等分析**（精准定位合同中哪一条明显偏袒对方、加重己方责任）
4. **修改建议与谈判策略**（给出可以直接替换的条款修改建议，以及实务谈判话术）`;

    const userPrompt = `请对以下材料进行基于【${currentAngle}】立场的合规审查：\n${combinedContent}`;

    this.logger.log(
      `开始合规审查，视角：${currentAngle}，共收到 ${files.length} 份文件`,
    );

    // 4. 合规审查需要极度严谨，温度设为较低的 0.1 或 0.2
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.1,
    );
  }

  /**
   * 🛠️ 直接复用我们完美打磨过的多文件解析方法
   */
  private async extractTextFromFile(file: MulterFile): Promise<string> {
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';

    try {
      let text = '';

      if (extension === 'pdf') {
        const parser = new PDFParse({ data: file.buffer });
        const result = await parser.getText();
        text = result.text;
      } else if (extension === 'docx') {
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        text = docxData.value;
      } else if (['txt', 'csv', 'md'].includes(extension)) {
        text = file.buffer.toString('utf-8');
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
      this.logger.error(`文件解析失败: ${file.originalname}`, error);
      return `[系统提示：文件解析失败]`;
    }
  }
}
