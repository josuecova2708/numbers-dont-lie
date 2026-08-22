import {
  IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  inviteCode?: string; // Si no se manda, se genera automáticamente

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  recurrenceDay?: number; // 0=Dom 1=Lun ... 6=Sáb
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  recurrenceDay?: number;
}

export class JoinGroupDto {
  @IsString()
  inviteCode: string;
}

export class CustomizeInviteCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  inviteCode: string;
}
