import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SearchCaseDto {
  @IsString()
  @IsOptional()
  categoryStr?: string;

  @IsString()
  @IsNotEmpty({ message: '案由或关键词不能为空' })
  keyword: string;

  @IsString()
  @IsOptional()
  amountStr?: string;

  @IsString()
  @IsOptional()
  courtStr?: string;

  @IsString()
  @IsOptional()
  dateRangeStr?: string;
}