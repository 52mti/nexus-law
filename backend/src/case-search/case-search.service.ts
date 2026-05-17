import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../dify/dify.service';
import { SearchCaseDto } from './dto/search-case.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaseSearchService {
  private readonly logger = new Logger(CaseSearchService.name);

  constructor(
    private readonly difyService: DifyService,
    private readonly configService: ConfigService,
  ) {}

  async search(dto: SearchCaseDto, targetLanguage?: string) {
    const inputs = {
      categoryStr: dto.categoryStr || '综合案件',
      keyword: dto.keyword,
      amountStr: dto.amountStr || '不限',
      courtStr: dto.courtStr || '不限',
      dateRangeStr: dto.dateRangeStr || '不限',
      target_language: targetLanguage || 'zh-CN',
    };

    this.logger.log(
      `开始类案检索: [${inputs.categoryStr}] 关键词:${inputs.keyword}`,
    );

    return this.difyService.generateMarkdown(
      inputs,
      this.configService.get<string>('DIFY_CASE_SEARCH'),
    );
  }
}
