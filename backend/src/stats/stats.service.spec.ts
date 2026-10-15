import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroupRole, MatchDayStatus, StatsContext } from '@prisma/client';
import { GroupsService } from '../groups/groups.service';
import { StatsService } from './stats.service';
import { localDateKey, localNoon, shiftKey } from '../match-days/match-day-dates';

// ─── Prisma en memoria (solo lo que usa StatsService) ─────
type Row = Record<string, any>;

function createFakePrisma() {
  const db = { matchDay: [] as Row[], membership: [] as Row[], stats: [] as Row[] };
  let seq = 0;
  const matchStat = (where: Row) => (s: Row) => {
    const w = where.playerId_matchDayId_context ?? where;
    return Object.entries(w).every(([k, v]) => s[k] === v);
  };

  const prisma: any = {
    db,
    matchDay: {
      findUnique: async ({ where }) => db.matchDay.find((m) => m.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }) => db.matchDay.find((m) => m.id === where.id),
    },
    membership: {
      findUnique: async ({ where: { userId_groupId: k } }) =>
        db.membership.find((m) => m.userId === k.userId && m.groupId === k.groupId) ?? null,
    },
    playerMatchStats: {
      findUnique: async ({ where }) =>
        where.id ? (db.stats.find((s) => s.id === where.id) ?? null) : (db.stats.find(matchStat(where)) ?? null),
      findMany: async ({ where }) => db.stats.filter(matchStat(where)),
      create: async ({ data }) => {
        const row = { id: `s${++seq}`, ...data };
        db.stats.push(row);
        return row;
      },
      update: async ({ where, data }) => Object.assign(db.stats.find((s) => s.id === where.id)!, data),
      upsert: async ({ where, create, update }) => {
        const existing = db.stats.find(matchStat(where));
        if (existing) return Object.assign(existing, update);
        const row = { id: `s${++seq}`, ...create };
        db.stats.push(row);
        return row;
      },
      deleteMany: async ({ where }) => {
        const before = db.stats.length;
        db.stats = db.stats.filter((s) => !matchStat(where)(s));
        return { count: before - db.stats.length };
      },
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(prisma),
  };
  return prisma;
}

const block = (goals = 0, extra: Partial<Record<string, number>> = {}) => ({
  goals,
  assists: 0,
  missedGoals: 0,
  ownGoals: 0,
  ballsOut: 0,
  ...extra,
});

describe('StatsService.saveDay', () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let service: StatsService;
  const today = localDateKey(new Date());

  beforeEach(() => {
    prisma = createFakePrisma();
    service = new StatsService(prisma, new GroupsService(prisma));

    prisma.db.matchDay.push(
      { id: 'md-past', groupId: 'g', date: localNoon(shiftKey(today, -7)), status: MatchDayStatus.COMPLETED },
      { id: 'md-today', groupId: 'g', date: localNoon(today), status: MatchDayStatus.SCHEDULED },
      { id: 'md-future', groupId: 'g', date: localNoon(shiftKey(today, 7)), status: MatchDayStatus.SCHEDULED },
      { id: 'md-cancelled', groupId: 'g', date: localNoon(shiftKey(today, -14)), status: MatchDayStatus.CANCELLED },
    );
    prisma.db.membership.push(
      { userId: 'org', groupId: 'g', teamId: null, role: GroupRole.ORGANIZER },
      { userId: 'cap', groupId: 'g', teamId: 'barca', role: GroupRole.CAPTAIN },
      { userId: 'ana', groupId: 'g', teamId: 'barca', role: GroupRole.PLAYER },
      { userId: 'leo', groupId: 'g', teamId: 'madrid', role: GroupRole.PLAYER },
      { userId: 'sin', groupId: 'g', teamId: null, role: GroupRole.PLAYER },
    );
  });

  const rows = (playerId: string, matchDayId = 'md-today') =>
    prisma.db.stats.filter((s) => s.playerId === playerId && s.matchDayId === matchDayId);

  it('guardar dos veces el mismo día REEMPLAZA (no suma) y no da 409', async () => {
    await service.saveDay('md-today', 'ana', 'ana', { team: block(2, { missedGoals: 1 }), other: null });
    await service.saveDay('md-today', 'ana', 'ana', { team: block(3, { missedGoals: 1 }), other: null });
    expect(rows('ana')).toHaveLength(1);
    expect(rows('ana')[0]).toMatchObject({ goals: 3, missedGoals: 1, context: StatsContext.TEAM });
  });

  it('las stats de aura negativa no tocan los goles', async () => {
    await service.saveDay('md-today', 'ana', 'ana', {
      team: block(1, { missedGoals: 4, ownGoals: 2, ballsOut: 3 }),
      other: null,
    });
    expect(rows('ana')[0]).toMatchObject({ goals: 1, missedGoals: 4, ownGoals: 2, ballsOut: 3 });
  });

  it('cada jornada guarda lo suyo: editar una no cambia la otra', async () => {
    await service.saveDay('md-past', 'ana', 'ana', { team: block(4), other: null });
    await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: null });
    expect(rows('ana', 'md-past')[0].goals).toBe(4);
    expect(rows('ana', 'md-today')[0].goals).toBe(1);
  });

  it('jugador SIN equipo puede guardar como comodín', async () => {
    await service.saveDay('md-today', 'sin', 'sin', { team: null, other: block(2) });
    expect(rows('sin')).toEqual([expect.objectContaining({ context: StatsContext.OTHER, teamId: null, goals: 2 })]);
  });

  it('jugador sin equipo que manda bloque de equipo → 400 claro y no escribe nada', async () => {
    await expect(service.saveDay('md-today', 'sin', 'sin', { team: block(1), other: block(1) })).rejects.toThrow(
      BadRequestException,
    );
    expect(rows('sin')).toHaveLength(0);
  });

  it('quitar el bloque comodín (other: null) lo BORRA del servidor', async () => {
    await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: block(5) });
    expect(rows('ana')).toHaveLength(2);
    await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: null });
    expect(rows('ana').map((r) => r.context)).toEqual([StatsContext.TEAM]);
  });

  it('un bloque omitido no se toca', async () => {
    await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: block(5) });
    await service.saveDay('md-today', 'ana', 'ana', { team: block(2) });
    expect(rows('ana').find((r) => r.context === StatsContext.OTHER)?.goals).toBe(5);
  });

  it('el teamId sale de la membresía, no del cliente', async () => {
    await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: block(1) });
    expect(rows('ana').find((r) => r.context === StatsContext.TEAM)?.teamId).toBe('barca');
    expect(rows('ana').find((r) => r.context === StatsContext.OTHER)?.teamId).toBeNull();
  });

  it('se puede cargar una jornada pasada días después (sin vencimiento)', async () => {
    await expect(service.saveDay('md-past', 'ana', 'ana', { team: block(1) })).resolves.toBeDefined();
  });

  it('jornada futura → 400', async () => {
    await expect(service.saveDay('md-future', 'ana', 'ana', { team: block(1) })).rejects.toThrow(
      'todavía no se ha jugado',
    );
  });

  it('jornada cancelada → 400', async () => {
    await expect(service.saveDay('md-cancelled', 'ana', 'ana', { team: block(1) })).rejects.toThrow('cancelada');
  });

  describe('permisos', () => {
    it('el capitán edita TEAM y comodín de un compañero', async () => {
      await service.saveDay('md-today', 'ana', 'ana', { team: block(1), other: block(1) });
      await service.saveDay('md-today', 'ana', 'cap', { team: block(2), other: block(3) });
      expect(rows('ana').map((r) => r.goals).sort()).toEqual([2, 3]);
    });

    it('el capitán NO edita a alguien de otro equipo', async () => {
      await expect(service.saveDay('md-today', 'leo', 'cap', { team: block(1) })).rejects.toThrow(ForbiddenException);
    });

    it('un jugador NO edita a otro', async () => {
      await expect(service.saveDay('md-today', 'ana', 'leo', { team: block(9) })).rejects.toThrow(ForbiddenException);
    });

    it('el organizador (aunque no tenga equipo) edita a cualquiera', async () => {
      await service.saveDay('md-today', 'leo', 'org', { team: block(1) });
      expect(rows('leo')[0]).toMatchObject({ teamId: 'madrid', goals: 1 });
    });
  });
});

describe('StatsService endpoints de compatibilidad', () => {
  it('create ignora el teamId del cliente y usa el de la membresía', async () => {
    const prisma = createFakePrisma();
    const service = new StatsService(prisma, new GroupsService(prisma));
    prisma.db.matchDay.push({ id: 'md', groupId: 'g', date: localNoon(localDateKey(new Date())), status: 'SCHEDULED' });
    prisma.db.membership.push({ userId: 'ana', groupId: 'g', teamId: 'barca', role: GroupRole.PLAYER });

    const row = await service.create('md', 'ana', { context: StatsContext.TEAM, teamId: 'otro-equipo', goals: 1 });
    expect(row.teamId).toBe('barca');
  });
});
