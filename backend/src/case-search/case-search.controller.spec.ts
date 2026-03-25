import { Test, TestingModule } from '@nestjs/testing';
import { CaseSearchController } from './case-search.controller';
import { CaseSearchService } from './case-search.service';

describe('CaseSearchController', () => {
  let controller: CaseSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaseSearchController],
      providers: [CaseSearchService],
    }).compile();

    controller = module.get<CaseSearchController>(CaseSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
