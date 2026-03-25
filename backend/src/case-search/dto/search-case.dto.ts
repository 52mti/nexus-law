import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class SearchCaseDto {
  @IsString()
  @IsOptional()
  categoryId?: string; // 案件大类，例如 'civil_case', 'criminal_case' 等 (SmartSidebar 默认会传)

  @IsString()
  @IsNotEmpty({ message: '案由或关键词不能为空' })
  docType: string; // 对应前端的“关键词信息”

  @IsOptional()
  content?: any; // 对应前端的“判决时间” (Date Range 通常是一个数组，或者为空)

  @IsString()
  @IsOptional()
  partyA?: string; // 对应前端的“涉案金额”枚举值

  @IsString()
  @IsOptional()
  partyB?: string; // 对应前端的“判决法院等级”枚举值
}