import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CreateStatsDto, UpdateStatsDto } from './stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('match-days/:matchDayId/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Post()
  create(@Param('matchDayId') matchDayId: string, @Body() dto: CreateStatsDto, @Request() req: any) {
    return this.statsService.create(matchDayId, req.user.sub, dto);
  }

  @Get()
  findAll(@Param('matchDayId') matchDayId: string, @Request() req: any) {
    return this.statsService.findAll(matchDayId, req.user.sub);
  }

  @Get('me')
  getMyStats(@Param('matchDayId') matchDayId: string, @Request() req: any) {
    return this.statsService.getMyStats(matchDayId, req.user.sub);
  }

  @Patch(':statId')
  update(
    @Param('matchDayId') matchDayId: string,
    @Param('statId') statId: string,
    @Body() dto: UpdateStatsDto,
    @Request() req: any,
  ) {
    return this.statsService.update(matchDayId, statId, req.user.sub, dto);
  }

  @Delete(':statId')
  remove(@Param('matchDayId') matchDayId: string, @Param('statId') statId: string, @Request() req: any) {
    return this.statsService.remove(matchDayId, statId, req.user.sub);
  }
}
