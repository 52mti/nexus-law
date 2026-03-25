import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { SearchCaseDto } from './dto/search-case.dto';

@Injectable()
export class CaseSearchService {
  constructor(private readonly openaiService: OpenaiService) {}

  async search(dto: SearchCaseDto) {
    const systemPrompt = `你是一名精通中国司法实践的类案检索辅助专家。
在没有外部实时裁判文书数据库的情况下，请基于你掌握的司法审判原则和典型指导性案例，对用户的案情进行类案趋势分析。
请按以下 Markdown 格式输出：
1. **相似案件裁判趋势**（总结此类案件在目前的司法实践中，法院通常的裁判倾向）
2. **同类案件法院关注要点**（法官审理此类案件时，最看重哪些证据或事实）
3. **参考法理与指导性案例精神**（如果有最高院指导性案例的相关精神，请予以说明，重在裁判规则的提取）`;

    const userPrompt = `请为以下案情提供类案趋势分析：\n\n${dto.content}`;

    // 类案分析需要一定的发散总结能力，温度设为 0.3
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.3,
    );
  }
}
