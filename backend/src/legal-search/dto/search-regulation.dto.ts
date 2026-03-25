import { IsString, IsNotEmpty } from 'class-validator';

export class SearchRegulationDto {
  @IsString()
  @IsNotEmpty({ message: '检索关键词或场景描述不能为空' })
  content: string;
}
