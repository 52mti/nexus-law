import { Test, TestingModule } from '@nestjs/testing';
import { CaseSearchService } from './case-search.service';

describe('CaseSearchService', () => {
  let service: CaseSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaseSearchService],
    }).compile();

    service = module.get<CaseSearchService>(CaseSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
