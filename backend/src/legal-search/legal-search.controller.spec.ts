import { Test, TestingModule } from '@nestjs/testing';
import { LegalSearchController } from './legal-search.controller';
import { LegalSearchService } from './legal-search.service';

describe('LegalSearchController', () => {
  let controller: LegalSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalSearchController],
      providers: [LegalSearchService],
    }).compile();

    controller = module.get<LegalSearchController>(LegalSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
