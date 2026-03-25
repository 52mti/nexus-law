import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { SummarizeCaseDto } from './dto/summarize-case.dto';

@Injectable()
export class CaseSummaryService {
  constructor(private readonly openaiService: OpenaiService) {}

  async summarize(dto: SummarizeCaseDto) {
    const systemPrompt = `你是一名具有十年诉讼经验的中国执业律师。
用户将输入一段杂乱无章的案件背景描述或当事人陈述。你需要进行专业的案情快梳。
请按以下 Markdown 格式输出：
1. **争议焦点归纳**（一针见血地指出本案的核心争议点）
2. **法律关系梳理**（明确各方当事人之间的法律关系，如合同关系、侵权关系等）
3. **关键事实时间轴**（将用户描述中提到的时间点提取并排序）
4. **初步诉讼/应对策略**（为当事人提供初步的法律行动建议）`;

    const userPrompt = `请对以下案情进行专业梳理：\n\n${dto.content}`;

    // 案情梳理需要一定的逻辑推理，温度可以稍微设为 0.3
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.3,
    );
  }
}
