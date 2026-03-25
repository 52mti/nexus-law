import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { AnalyzeComplianceDto } from './dto/analyze-compliance.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly openaiService: OpenaiService) {}

  async analyze(dto: AnalyzeComplianceDto) {
    // 🚀 这里的 System Prompt 是灵魂！
    const systemPrompt = `你是一名资深的中国企业合规风控律师。
你的任务是对用户提供的商业模式、合同条款或业务流程进行合规审查。
请按照以下结构输出 Markdown 报告：
1. **核心合规风险提示**（直接指出最致命的法律漏洞）
2. **风险等级评估**（高/中/低，并说明理由）
3. **法律依据**（列出可能触碰的现行法律法规名称）
4. **修改建议与合规方案**（给出具体的、可落地的整改建议）`;

    const userPrompt = `请对以下内容进行合规审查：\n\n${dto.content}`;

    // 直接复用底层大模型方法 (稍微降低点温度，合规需要严谨)
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.2,
    );
  }
}
