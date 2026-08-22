import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { StatsContext } from '@prisma/client';

export class CreateStatsDto {
  @IsEnum(StatsContext)
  context: StatsContext;

  @IsOptional()
  @IsUUID()
  teamId?: string; // Requerido si context = TEAM

  @IsOptional()
  @IsInt()
  @Min(0)
  goals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  assists?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  missedGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ownGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ballsOut?: number;
}

export class UpdateStatsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  goals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  assists?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  missedGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ownGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ballsOut?: number;
}
