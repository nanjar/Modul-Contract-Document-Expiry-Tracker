import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideOfficeApprovalDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
