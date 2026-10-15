import { LeaderboardsService } from './leaderboards.service';

describe('LeaderboardsService', () => {
  const makeService = (sums: Record<string, number>) => {
    const groupBy = jest.fn().mockResolvedValue([{ playerId: 'ana', teamId: 'barca', _sum: sums }]);
    const prisma: any = {
      playerMatchStats: { groupBy },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'ana', displayName: 'Ana' }) },
      membership: { findUnique: jest.fn().mockResolvedValue({ team: null }) },
      team: { findUnique: jest.fn().mockResolvedValue({ id: 'barca' }) },
    };
    const groups: any = { assertMember: jest.fn().mockResolvedValue({}) };
    return { service: new LeaderboardsService(prisma, groups), groupBy };
  };

  it('ranking de jugadores: goles = suma de goals, sin mezclar aura negativa', async () => {
    const { service } = makeService({ goals: 3, assists: 1, missedGoals: 5, ownGoals: 2, ballsOut: 4 });
    const [entry] = await service.getPlayerRanking('g', 'u');
    expect(entry).toMatchObject({ goals: 3, assists: 1, missedGoals: 5, ownGoals: 2, ballsOut: 4 });
  });

  it('aura negativa: total = fallados + autogoles + afuera, sin goles', async () => {
    const { service } = makeService({ goals: 10, missedGoals: 1, ownGoals: 1, ballsOut: 1 });
    const [entry] = await service.getFunnyLeaderboard('g', 'u');
    expect(entry.total).toBe(3);
  });

  it('filtra por jornada cuando se pide (jugadores y equipos)', async () => {
    const { service, groupBy } = makeService({ goals: 1, assists: 0 });
    await service.getPlayerRanking('g', 'u', 'md1');
    await service.getTeamStandings('g', 'u', 'md1');
    expect(groupBy.mock.calls[0][0].where).toEqual({ matchDay: { groupId: 'g', id: 'md1' } });
    expect(groupBy.mock.calls[1][0].where.matchDay).toEqual({ groupId: 'g', id: 'md1' });
  });
});
