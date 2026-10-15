import { UsersService } from './users.service';

describe('UsersService.getHistoricalStats', () => {
  it('TEAM + comodín en la misma jornada cuenta como 1 partido', async () => {
    const prisma: any = {
      playerMatchStats: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { goals: 3, assists: 1, missedGoals: 0, ownGoals: 0, ballsOut: 0 },
        }),
        // 3 filas en 2 jornadas → groupBy devuelve 2 jornadas distintas
        groupBy: jest.fn().mockResolvedValue([{ matchDayId: 'md1' }, { matchDayId: 'md2' }]),
      },
    };
    const result = await new UsersService(prisma).getHistoricalStats('ana');
    expect(result.matchesPlayed).toBe(2);
    expect(prisma.playerMatchStats.groupBy).toHaveBeenCalledWith({ by: ['matchDayId'], where: { playerId: 'ana' } });
  });
});
