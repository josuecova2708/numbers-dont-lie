import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class LeaderboardsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  async getPlayerRanking(groupId: string, userId: string, matchDayId?: string) {
    await this.groupsService.assertMember(userId, groupId);

    const whereMatchDay = matchDayId
      ? { matchDay: { groupId, id: matchDayId } }
      : { matchDay: { groupId } };

    const stats = await this.prisma.playerMatchStats.groupBy({
      by: ['playerId'],
      where: whereMatchDay,
      _sum: {
        goals: true,
        assists: true,
        missedGoals: true,
        ownGoals: true,
        ballsOut: true,
      },
      orderBy: { _sum: { goals: 'desc' } },
    });

    // Enrich with user info
    const enriched = await Promise.all(
      stats.map(async (s) => {
        const user = await this.prisma.user.findUnique({
          where: { id: s.playerId },
          select: { id: true, displayName: true, avatarUrl: true },
        });
        const membership = await this.prisma.membership.findUnique({
          where: { userId_groupId: { userId: s.playerId, groupId } },
          include: { team: { select: { id: true, name: true, color: true } } },
        });
        return {
          player: user,
          team: membership?.team || null,
          goals: s._sum.goals || 0,
          assists: s._sum.assists || 0,
          missedGoals: s._sum.missedGoals || 0,
          ownGoals: s._sum.ownGoals || 0,
          ballsOut: s._sum.ballsOut || 0,
        };
      }),
    );

    return enriched;
  }

  async getTeamStandings(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);

    // Team stats only count TEAM context
    const stats = await this.prisma.playerMatchStats.groupBy({
      by: ['teamId'],
      where: {
        matchDay: { groupId },
        context: 'TEAM',
        teamId: { not: null },
      },
      _sum: {
        goals: true,
        assists: true,
      },
      orderBy: { _sum: { goals: 'desc' } },
    });

    const enriched = await Promise.all(
      stats
        .filter((s) => s.teamId)
        .map(async (s) => {
          const team = await this.prisma.team.findUnique({
            where: { id: s.teamId! },
            select: { id: true, name: true, color: true },
          });
          return {
            team,
            goals: s._sum.goals || 0,
            assists: s._sum.assists || 0,
          };
        }),
    );

    return enriched;
  }

  async getFunnyLeaderboard(groupId: string, userId: string, matchDayId?: string) {
    // Returns ranking by missedGoals, ownGoals, ballsOut separately
    await this.groupsService.assertMember(userId, groupId);

    const whereMatchDay = matchDayId
      ? { matchDay: { groupId, id: matchDayId } }
      : { matchDay: { groupId } };

    const stats = await this.prisma.playerMatchStats.groupBy({
      by: ['playerId'],
      where: whereMatchDay,
      _sum: {
        missedGoals: true,
        ownGoals: true,
        ballsOut: true,
      },
    });

    const enriched = await Promise.all(
      stats.map(async (s) => {
        const user = await this.prisma.user.findUnique({
          where: { id: s.playerId },
          select: { id: true, displayName: true, avatarUrl: true },
        });
        return {
          player: user,
          missedGoals: s._sum.missedGoals || 0,
          ownGoals: s._sum.ownGoals || 0,
          ballsOut: s._sum.ballsOut || 0,
          total: (s._sum.missedGoals || 0) + (s._sum.ownGoals || 0) + (s._sum.ballsOut || 0),
        };
      }),
    );

    return enriched.sort((a, b) => b.total - a.total);
  }
}
