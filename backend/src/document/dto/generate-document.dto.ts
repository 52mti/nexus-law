import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class GenerateDocumentDto {
  @IsString()
  @IsNotEmpty({ message: '缺少合同场景' })
  scene: string; // 例如 "商事经营合同"

  @IsString()
  @IsNotEmpty({ message: '缺少文书类型' })
  document_type: string; // 例如 "股权转让协议"

  @IsString()
  @IsNotEmpty({ message: '缺少甲方信息' })
  @MaxLength(500)
  party_a: string; // 甲方显示名，不需要 ID

  @IsString()
  @IsNotEmpty({ message: '缺少乙方信息' })
  @MaxLength(500)
  party_b: string; // 乙方显示名，不需要 ID

  @IsString()
  @IsNotEmpty({ message: '内容描述不能为空' })
  @MaxLength(2000)
  content_desc: string; // 内容描述
}

