import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SearchRegulationDto {
  @IsString()
  @IsNotEmpty({ message: '请选择条文类型' })
  lawType: string; // 例如: '民法典', '劳动法', '刑法', '公司法', '行政诉讼法', '不限'

  @IsString()
  @IsOptional()
  articleNumber?: string; // 条款编号（可选），例如: '第一千零四条' 或 '104'

  @IsString()
  @IsNotEmpty({ message: '案情或关键词描述不能为空' })
  keyword: string; // 核心案情或关键词
}