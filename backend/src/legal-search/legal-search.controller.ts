import { Controller, Post, Body, Sse } from '@nestjs/common';
import { LegalSearchService } from './legal-search.service';
import { SearchRegulationDto } from './dto/search-regulation.dto';

@Controller('api/regulation')
export class LegalSearchController {
  constructor(private readonly regulationService: LegalSearchService) {}

  @Post('search')
  @Sse('search')
  search(@Body() dto: SearchRegulationDto) {
    return this.regulationService.search(dto);
  }
}
