import { Controller, Post, Body, Sse, Headers } from '@nestjs/common';
import { LegalSearchService } from './legal-search.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Controller('api/regulation')
export class LegalSearchController {
  constructor(private readonly regulationService: LegalSearchService) {}

  @Post('search')
  @Sse('search')
  search(
    @Body() dto: SearchRegulationDto,
    @Headers('target_language') targetLanguage: string,
  ) {
    return this.regulationService.search(dto, targetLanguage);
  }
}
