import { Test, TestingModule } from '@nestjs/testing';
import { CaseSummaryService } from './case-summary.service';

describe('CaseSummaryService', () => {
  let service: CaseSummaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaseSummaryService],
    }).compile();

    service = module.get<CaseSummaryService>(CaseSummaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
