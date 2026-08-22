import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GroupRole } from '@prisma/client';

export class UpdateMembershipDto {
  @IsOptional()
  @IsUUID()
  teamId?: string | null;

  @IsOptional()
  @IsEnum(GroupRole)
  role?: GroupRole;
}
