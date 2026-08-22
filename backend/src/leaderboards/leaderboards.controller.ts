import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/leaderboard')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get()
  getPlayerRanking(
    @Param('groupId') groupId: string,
    @Query('matchDayId') matchDayId: string,
    @Request() req: any,
  ) {
    return this.leaderboardsService.getPlayerRanking(groupId, req.user.sub, matchDayId);
  }

  @Get('teams')
  getTeamStandings(@Param('groupId') groupId: string, @Request() req: any) {
    return this.leaderboardsService.getTeamStandings(groupId, req.user.sub);
  }

  @Get('funny')
  getFunnyLeaderboard(
    @Param('groupId') groupId: string,
    @Query('matchDayId') matchDayId: string,
    @Request() req: any,
  ) {
    return this.leaderboardsService.getFunnyLeaderboard(groupId, req.user.sub, matchDayId);
  }
}
