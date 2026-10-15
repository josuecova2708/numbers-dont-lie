import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StatsContext } from '@prisma/client';

export class CreateStatsDto {
  @IsOptional()
  @IsUUID()
  playerId?: string;

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

export class StatsBlockDto {
  @IsInt()
  @Min(0)
  @Max(99)
  goals: number;

  @IsInt()
  @Min(0)
  @Max(99)
  assists: number;

  @IsInt()
  @Min(0)
  @Max(99)
  missedGoals: number;

  @IsInt()
  @Min(0)
  @Max(99)
  ownGoals: number;

  @IsInt()
  @Min(0)
  @Max(99)
  ballsOut: number;
}

/**
 * Totales de UN jugador en UNA jornada. Reemplaza lo que hubiera (no suma).
 * `null` en un bloque = no jugó en ese contexto → se borra si existía; omitido = no se toca.
 */
export class SaveDayStatsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => StatsBlockDto)
  team?: StatsBlockDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => StatsBlockDto)
  other?: StatsBlockDto | null;
}
