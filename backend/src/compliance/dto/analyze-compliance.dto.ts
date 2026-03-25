import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AnalyzeComplianceDto {
  @IsString()
  @IsNotEmpty({ message: '审查角度不能为空' })
  @IsIn(['partyA', 'partyB', 'neutral'], { message: '审查角度不合法' })
  reviewAngle: string; // 'partyA' | 'partyB' | 'neutral'
}
