import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../chat/dify.service';
import { SearchCaseDto } from './dto/search-case.dto';

@Injectable()
export class CaseSearchService {
  private readonly logger = new Logger(CaseSearchService.name);

  constructor(private readonly difyService: DifyService) {}

  async search(dto: SearchCaseDto) {
    // 1. 字典映射：将前端的枚举值还原为自然语言
    const amountMap: Record<string, string> = {
      '1': '1万以下',
      '2': '1-5万',
      '3': '5-20万',
      '4': '20-100万',
      '5': '100万以上',
    };

    const courtMap: Record<string, string> = {
      '1': '最高法院/联邦最高法院',
      '2': '高级人民法院/地区高等法院',
      '3': '基层人民法院',
      '4': '专门法院（如知产、海事法院）',
    };

    const categoryMap: Record<string, string> = {
      civil_case: '民事案件',
      criminal_case: '刑事案件',
      labor_dispute: '劳动争议案件',
      commercial_case: '商事案件',
      administrative_case: '行政案件',
      intellectual_property: '知识产权案件',
      family_case: '家事案件',
    };

    // 提取并转换条件
    const keyword = dto.docType;
    const categoryStr = dto.categoryId
      ? categoryMap[dto.categoryId] || '综合案件'
      : '综合案件';
    const amountStr = dto.partyA ? amountMap[dto.partyA] || '不限' : '不限';
    const courtStr = dto.partyB ? courtMap[dto.partyB] || '不限' : '不限';

    // 处理时间范围
    let dateRangeStr = '不限';
    if (Array.isArray(dto.content) && dto.content.length === 2) {
      dateRangeStr = `${dto.content[0]} 至 ${dto.content[1]}`;
    }

    // 2. 🧠 系统提示词（防幻觉设计的核心所在）
    const systemPrompt = `你是一个专业的中国法律判例检索与类案分析AI系统。
用户将输入一系列案件检索条件，你需要输出结构化的类案检索报告。
⚠️【极其重要】：
1. 请尽量检索和引用真实的、具有指导意义的生效判例（如最高法指导性案例、公报案例）。
2. 如果你的知识库中无法找到完全契合的真实案例，**允许你基于现行适用法律生成高度逼真的模拟推演案例，但必须在【案号】后明确标注“（AI模拟推演案例）”**，绝不允许将编造的案例伪装成真实案件误导用户！
3. 请严格按照 Markdown 格式输出，重点提炼裁判要旨和法院观点。`;

    // 3. 📝 组装用户输入
    const userPrompt = `请根据以下条件进行类案匹配与检索：
- **案件大类**：${categoryStr}
- **核心关键词/争议焦点**：${keyword}
- **涉案金额区间**：${amountStr}
- **判决法院层级**：${courtStr}
- **判决时间范围**：${dateRangeStr}

请为我提供 2-3 个最相关的判例，并提取出核心的“裁判要旨”。最后给出一个简短的“检索总结与司法倾向分析”。`;

    this.logger.log(`开始类案检索: [${categoryStr}] 关键词:${keyword}`);

    // 4. 调用大模型 (检索类任务温度不宜过高，0.2 比较合适)
    return await this.difyService.generateMarkdown(
      systemPrompt,
      userPrompt,
      0.2,
    );
  }
}
