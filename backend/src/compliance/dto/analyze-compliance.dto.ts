import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeComplianceDto {
  @IsString()
  @IsNotEmpty({ message: '待审查的内容不能为空' })
  content: string; // 前端传过来的合同文本或商业模式描述
}
