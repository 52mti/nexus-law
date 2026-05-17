import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DifyService } from '../dify/dify.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Injectable()
export class LegalSearchService {
  constructor(
    private readonly difyService: DifyService,
    private readonly configService: ConfigService,
  ) {}

  search(dto: SearchRegulationDto, targetLanguage?: string) {
    const { lawType, articleNumber, keyword } = dto;

    const inputs = {
      lawType: lawType || '不限',
      articleNumber: articleNumber || '',
      keyword,
      target_language: targetLanguage || 'zh-CN',
    };

    return this.difyService.generateMarkdown(
      inputs,
      this.configService.get<string>('DIFY_LEGAL_SEARCH'),
    );
  }
}
