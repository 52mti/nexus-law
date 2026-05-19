import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class SummarizeCaseDto {
  @IsString()
  @IsOptional()
  remarks?: string; // 用户除了传文件外，可能还会补充一些口头描述或侧重点

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: '文件链接不能为空' })
  fileUrls: string[];
}
