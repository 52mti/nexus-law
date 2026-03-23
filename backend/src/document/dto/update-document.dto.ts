import { PartialType } from '@nestjs/mapped-types';
import { GenerateDocumentDto } from './generate-document.dto';

export class UpdateDocumentDto extends PartialType(GenerateDocumentDto) {}
