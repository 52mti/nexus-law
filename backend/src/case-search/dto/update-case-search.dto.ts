import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseSearchDto } from './create-case-search.dto';

export class UpdateCaseSearchDto extends PartialType(CreateCaseSearchDto) {}
