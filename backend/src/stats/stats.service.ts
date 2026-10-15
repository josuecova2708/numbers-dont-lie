import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateStatsDto, SaveDayStatsDto, StatsBlockDto, UpdateStatsDto } from './stats.dto';
import { GroupRole, MatchDay, MatchDayStatus, Membership, StatsContext } from '@prisma/client';
import { acceptsStats } from '../match-days/match-day-dates';

const statsInclude = {
  player: { select: { id: true, displayName: true, avatarUrl: true } },
  team: { select: { id: true, name: true, color: true } },
};

@Injectable()
export class StatsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────
  private async getWritableMatchDay(matchDayId: string): Promise<MatchDay> {
    const matchDay = await this.prisma.matchDay.findUnique({ where: { id: matchDayId } });
    if (!matchDay) throw new NotFoundException('Jornada no encontrada');
    if (!acceptsStats(matchDay)) {
      throw new BadRequestException(
        matchDay.status === MatchDayStatus.CANCELLED
          ? 'Esta jornada fue cancelada'
          : 'Esta jornada todavía no se ha jugado',
      );
    }
    return matchDay;
  }

  /**
   * Quién puede registrar/editar stats de `playerId`:
   * él mismo, el organizador, o el capitán de su mismo equipo.
   * Devuelve la membresía del jugador (de ahí sale su equipo, nunca del cliente).
   */
  private async assertCanEditPlayer(actorId: string, playerId: string, groupId: string): Promise<Membership> {
    const actor = await this.groupsService.assertMember(actorId, groupId);
    if (actorId === playerId) return actor;

    const target = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId: playerId, groupId } },
    });
    if (!target) throw new BadRequestException('El jugador no pertenece al grupo');

    if (actor.role === GroupRole.ORGANIZER) return target;
    if (actor.role === GroupRole.CAPTAIN && actor.teamId && actor.teamId === target.teamId) return target;
    if (actor.role === GroupRole.CAPTAIN) {
      throw new ForbiddenException('Solo puedes registrar stats de jugadores de tu equipo');
    }
    throw new ForbiddenException('No tienes permisos para registrar stats de otro jugador');
  }

  private teamIdFor(context: StatsContext, membership: Membership): string | null {
    if (context === StatsContext.OTHER) return null;
    if (!membership.teamId) {
      throw new BadRequestException('Este jugador no tiene equipo asignado: registra sus stats como comodín');
    }
    return membership.teamId;
  }

  // ─── Guardado del día (reemplaza, no suma) ──────────────
  async saveDay(matchDayId: string, playerId: string, actorId: string, dto: SaveDayStatsDto) {
    const matchDay = await this.getWritableMatchDay(matchDayId);
    const membership = await this.assertCanEditPlayer(actorId, playerId, matchDay.groupId);

    const blocks: [StatsContext, StatsBlockDto | null | undefined][] = [
      [StatsContext.TEAM, dto.team],
      [StatsContext.OTHER, dto.other],
    ];
    // Validar antes de escribir nada
    const teamId = dto.team ? this.teamIdFor(StatsContext.TEAM, membership) : null;

    await this.prisma.$transaction(async (tx) => {
      for (const [context, block] of blocks) {
        if (block === undefined) continue; // no se mandó → no se toca
        const where = { playerId_matchDayId_context: { playerId, matchDayId, context } };
        if (block) {
          const values = {
            goals: block.goals,
            assists: block.assists,
            missedGoals: block.missedGoals,
            ownGoals: block.ownGoals,
            ballsOut: block.ballsOut,
            teamId: context === StatsContext.TEAM ? teamId : null,
          };
          await tx.playerMatchStats.upsert({
            where,
            create: { playerId, matchDayId, context, ...values },
            update: values,
          });
        } else {
          await tx.playerMatchStats.deleteMany({ where: { playerId, matchDayId, context } });
        }
      }
    });

    return this.prisma.playerMatchStats.findMany({
      where: { matchDayId, playerId },
      include: statsInclude,
    });
  }

  // ─── Endpoints individuales (compatibilidad) ────────────
  async create(matchDayId: string, actorId: string, dto: CreateStatsDto) {
    const targetUserId = dto.playerId || actorId;
    const matchDay = await this.getWritableMatchDay(matchDayId);
    const membership = await this.assertCanEditPlayer(actorId, targetUserId, matchDay.groupId);
    const teamId = this.teamIdFor(dto.context, membership);

    const existing = await this.prisma.playerMatchStats.findUnique({
      where: { playerId_matchDayId_context: { playerId: targetUserId, matchDayId, context: dto.context } },
    });
    if (existing) {
      throw new ConflictException(`Ya hay estadísticas registradas en contexto ${dto.context} para esta jornada`);
    }

    return this.prisma.playerMatchStats.create({
      data: {
        playerId: targetUserId,
        matchDayId,
        context: dto.context,
        teamId,
        goals: dto.goals || 0,
        assists: dto.assists || 0,
        missedGoals: dto.missedGoals || 0,
        ownGoals: dto.ownGoals || 0,
        ballsOut: dto.ballsOut || 0,
      },
      include: statsInclude,
    });
  }

  async findAll(matchDayId: string, userId: string) {
    const matchDay = await this.prisma.matchDay.findUniqueOrThrow({ where: { id: matchDayId } });
    await this.groupsService.assertMember(userId, matchDay.groupId);

    return this.prisma.playerMatchStats.findMany({
      where: { matchDayId },
      include: statsInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(matchDayId: string, statId: string, actorId: string, dto: UpdateStatsDto) {
    const stat = await this.prisma.playerMatchStats.findUnique({ where: { id: statId } });
    if (!stat || stat.matchDayId !== matchDayId) throw new NotFoundException('Estadística no encontrada');

    const matchDay = await this.getWritableMatchDay(matchDayId);
    await this.assertCanEditPlayer(actorId, stat.playerId, matchDay.groupId);

    return this.prisma.playerMatchStats.update({
      where: { id: statId },
      data: dto,
      include: statsInclude,
    });
  }

  async remove(matchDayId: string, statId: string, actorId: string) {
    const stat = await this.prisma.playerMatchStats.findUnique({
      where: { id: statId },
      include: { matchDay: true },
    });
    if (!stat || stat.matchDayId !== matchDayId) throw new NotFoundException('Estadística no encontrada');

    const groupId = stat.matchDay.groupId;
    await this.groupsService.assertOrganizer(actorId, groupId);
    await this.prisma.playerMatchStats.delete({ where: { id: statId } });
  }

  async getMyStats(matchDayId: string, userId: string) {
    return this.prisma.playerMatchStats.findMany({
      where: { matchDayId, playerId: userId },
      include: { team: { select: { id: true, name: true, color: true } } },
    });
  }
}
