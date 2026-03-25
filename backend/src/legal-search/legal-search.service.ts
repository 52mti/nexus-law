import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Injectable()
export class LegalSearchService {
  constructor(private readonly openaiService: OpenaiService) {}

  async search(dto: SearchRegulationDto) {
    const { lawType, articleNumber, keyword } = dto;

    // 1. 系统级人设：严守底线
    const systemPrompt = `你是一个精通中国现行法律法规的法律检索专家。
用户会输入结构化的检索条件，你需要为其精准提取相关的法律规定。
⚠️ 致命警告：你必须且只能引用真实的、现行有效的中国法律法规。绝不能为了迎合用户而编造不存在的法条！
请按以下 Markdown 格式输出：
1. **适用法律法规**（精确到具体的法律名称和条文序号）
2. **法条原文精要**（总结或引用该法条的核心内容）
3. **法条适用分析**（结合用户的场景或关键词，解释该条文为何适用）`;

    // 2. 动态组装用户输入：精准制导
    let userPrompt = '请根据以下检索条件，提供精准的法律条文支持：\n\n';

    // 处理法条范围限制
    if (lawType && lawType !== '不限') {
      userPrompt += `- **限定检索范围**：必须在《${lawType}》及相关司法解释中进行检索。\n`;
    } else {
      userPrompt += `- **限定检索范围**：不限（请根据关键词，自动在现行中国法律体系中匹配最精准的部门法）。\n`;
    }

    // 处理具体法条编号（如果有传的话）
    if (articleNumber) {
      userPrompt += `- **重点关注条文**：第 ${articleNumber} 条（请优先解读该条文，若发现该条文与关键词无关，请纠正并补充真正适用的条文）。\n`;
    }

    // 核心关键词
    userPrompt += `- **案情/关键词描述**：${keyword}\n`;

    // 3. 调大模型 (严谨检索，温度设为极低的 0.1)
    return await this.openaiService.generateLegalMarkdown(
      systemPrompt,
      userPrompt,
      0.1,
    );
  }
}
