import { Test, TestingModule } from '@nestjs/testing';
import { LegalSearchService } from './legal-search.service';

describe('LegalSearchService', () => {
  let service: LegalSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegalSearchService],
    }).compile();

    service = module.get<LegalSearchService>(LegalSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
