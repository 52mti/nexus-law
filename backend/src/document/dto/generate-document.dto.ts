import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class GenerateDocumentDto {
  @IsString()
  @IsNotEmpty({ message: '缺少文书类型标识' })
  category: string; // 对应前端 categories 里的 id，比如 'civil_lawsuit'

  @IsString()
  @IsOptional()
  docType?: string; // 对应前端选择的具体小类，如 '个人借款'

  @IsString()
  @IsOptional()
  @MaxLength(500)
  partyA?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  partyB?: string;

  @IsString()
  @IsNotEmpty({ message: '案情或文书内容描述不能为空' })
  @MaxLength(2000)
  content: string;
}
