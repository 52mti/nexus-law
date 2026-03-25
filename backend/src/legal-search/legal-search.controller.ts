import { Controller, Post, Body } from '@nestjs/common';
import { LegalSearchService } from './legal-search.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Controller('api/regulation')
export class LegalSearchController {
  constructor(private readonly regulationService: LegalSearchService) {}

  @Post('search')
  async search(@Body() dto: SearchRegulationDto) {
    const result = await this.regulationService.search(dto);
    return {
      code: 0,
      message: '法条检索完成',
      data: result,
    };
  }
}
