import { IsString, IsNotEmpty } from 'class-validator';

export class SearchCaseDto {
  @IsString()
  @IsNotEmpty({ message: '类案检索条件不能为空' })
  content: string;
}
