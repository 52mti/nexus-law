import { PartialType } from '@nestjs/mapped-types';
import { CreateLegalSearchDto } from './create-legal-search.dto';

export class UpdateLegalSearchDto extends PartialType(CreateLegalSearchDto) {}
