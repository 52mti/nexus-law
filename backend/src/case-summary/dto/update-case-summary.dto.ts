import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseSummaryDto } from './create-case-summary.dto';

export class UpdateCaseSummaryDto extends PartialType(CreateCaseSummaryDto) {}
