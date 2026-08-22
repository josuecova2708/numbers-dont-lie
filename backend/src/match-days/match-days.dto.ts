import {
  IsString, IsDateString, IsOptional, IsEnum, IsInt, Min, Max,
} from 'class-validator';
import { MatchDayStatus } from '@prisma/client';

export class CreateMatchDayDto {
  @IsString()
  label: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(MatchDayStatus)
  status?: MatchDayStatus;
}

export class UpdateMatchDayDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(MatchDayStatus)
  status?: MatchDayStatus;
}

export class GenerateRecurringDto {
  @IsInt()
  @Min(1)
  @Max(52)
  weeksAhead: number;
}
