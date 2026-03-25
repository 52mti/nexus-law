import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Injectable()
export class LegalSearchService {
  constructor(private readonly openaiService: OpenaiService) {}

  async search(dto: SearchRegulationDto) {
    const systemPrompt = `你是一个精通中国现行法律法规的法律检索专家。
用户会输入一个法律问题或场景，你需要为其检索相关的法律规定。
⚠️ 警告：你必须且只能引用真实的、现行有效的中国法律法规（如《中华人民共和国民法典》等）。绝不能编造不存在的法条。如果无法确定具体条文，请说明相关法理依据。
请按以下 Markdown 格式输出：
1. **适用法律法规**（精确到具体的法律名称和条文序号）
2. **法条原文精要**（总结该法条的核心内容）
3. **法条适用分析**（结合用户的场景，解释该条文为何适用）`;

    const userPrompt = `请为以下场景检索相关法律条文：\n\n${dto.content}`;

    // 法律检索必须极其严谨，杜绝幻觉，温度设为极低的 0.1
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.1,
    );
  }
}
