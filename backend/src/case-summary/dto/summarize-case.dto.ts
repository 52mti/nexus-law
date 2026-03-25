import { IsString, IsNotEmpty } from 'class-validator';

export class SummarizeCaseDto {
  @IsString()
  @IsNotEmpty({ message: '案情描述不能为空' })
  content: string;
}
