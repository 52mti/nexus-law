import { Test, TestingModule } from '@nestjs/testing';
import { CaseSummaryController } from './case-summary.controller';
import { CaseSummaryService } from './case-summary.service';

describe('CaseSummaryController', () => {
  let controller: CaseSummaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaseSummaryController],
      providers: [CaseSummaryService],
    }).compile();

    controller = module.get<CaseSummaryController>(CaseSummaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
