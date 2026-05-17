import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../dify/dify.service';
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

    const inputs = {
      categoryStr,
      keyword,
      amountStr,
      courtStr,
      dateRangeStr,
    };

    this.logger.log(`开始类案检索: [${categoryStr}] 关键词:${keyword}`);

    return this.difyService.generateMarkdown(
      inputs,
    );
  }
}
