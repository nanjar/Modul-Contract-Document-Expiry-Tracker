import { IsUUID } from 'class-validator';

export class CreateOfficeApprovalDto {
  @IsUUID()
  approverId!: string;
}
