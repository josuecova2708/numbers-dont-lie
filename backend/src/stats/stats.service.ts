import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateStatsDto, UpdateStatsDto } from './stats.dto';
import { GroupRole, StatsContext } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  async create(matchDayId: string, actorId: string, dto: CreateStatsDto) {
    const targetUserId = dto.playerId || actorId;

    // Get matchDay to verify group membership
    const matchDay = await this.prisma.matchDay.findUniqueOrThrow({
      where: { id: matchDayId },
    });
    const actorMembership = await this.groupsService.assertMember(actorId, matchDay.groupId);

    // If uploading for someone else, verify permissions
    if (targetUserId !== actorId) {
      if (actorMembership.role === GroupRole.PLAYER) {
        throw new ForbiddenException('No tienes permisos para registrar stats de otro jugador');
      }
      
      const targetMembership = await this.prisma.membership.findUnique({
        where: { userId_groupId: { userId: targetUserId, groupId: matchDay.groupId } },
      });
      
      if (!targetMembership) {
        throw new BadRequestException('El jugador no pertenece al grupo');
      }
      
      if (actorMembership.role === GroupRole.CAPTAIN && actorMembership.teamId !== targetMembership.teamId) {
         throw new ForbiddenException('Solo puedes registrar stats de jugadores de tu equipo');
      }
    }

    // Validate: if TEAM context, teamId is required
    if (dto.context === StatsContext.TEAM && !dto.teamId) {
      throw new BadRequestException('teamId es requerido cuando el contexto es TEAM');
    }

    // Verify user belongs to that team when context = TEAM
    if (dto.context === StatsContext.TEAM && dto.teamId) {
      const membership = await this.prisma.membership.findUnique({
        where: { userId_groupId: { userId: targetUserId, groupId: matchDay.groupId } },
      });
      if (!membership?.teamId || membership.teamId !== dto.teamId) {
        throw new ForbiddenException('Solo puedes registrar stats de TEAM para tu propio equipo');
      }
    }

    // Check for duplicate
    const existing = await this.prisma.playerMatchStats.findUnique({
      where: { playerId_matchDayId_context: { playerId: targetUserId, matchDayId, context: dto.context } },
    });
    if (existing) {
      throw new ConflictException(`Ya tienes estadísticas registradas en contexto ${dto.context} para esta jornada`);
    }

    return this.prisma.playerMatchStats.create({
      data: {
        playerId: targetUserId,
        matchDayId,
        context: dto.context,
        teamId: dto.context === StatsContext.TEAM ? dto.teamId : null,
        goals: dto.goals || 0,
        assists: dto.assists || 0,
        missedGoals: dto.missedGoals || 0,
        ownGoals: dto.ownGoals || 0,
        ballsOut: dto.ballsOut || 0,
      },
      include: {
        player: { select: { id: true, displayName: true, avatarUrl: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findAll(matchDayId: string, userId: string) {
    const matchDay = await this.prisma.matchDay.findUniqueOrThrow({ where: { id: matchDayId } });
    await this.groupsService.assertMember(userId, matchDay.groupId);

    return this.prisma.playerMatchStats.findMany({
      where: { matchDayId },
      include: {
        player: { select: { id: true, displayName: true, avatarUrl: true } },
        team: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(matchDayId: string, statId: string, actorId: string, dto: UpdateStatsDto) {
    const stat = await this.prisma.playerMatchStats.findUnique({
      where: { id: statId },
      include: { matchDay: true },
    });
    if (!stat || stat.matchDayId !== matchDayId) throw new NotFoundException('Estadística no encontrada');

    const groupId = stat.matchDay.groupId;
    const actorMembership = await this.groupsService.assertMember(actorId, groupId);

    // Permission logic:
    // 1. Own stats → always can edit
    // 2. Captain → can edit TEAM stats of their own team only
    // 3. Organizer → can edit anything
    const isOwner = stat.playerId === actorId;
    const isOrganizer = actorMembership.role === GroupRole.ORGANIZER;

    if (!isOwner && !isOrganizer) {
      // Check if captain of the stat's team
      if (actorMembership.role !== GroupRole.CAPTAIN) {
        throw new ForbiddenException('No tienes permiso para editar estas estadísticas');
      }
      if (stat.context === StatsContext.OTHER) {
        throw new ForbiddenException('El capitán solo puede editar estadísticas del tipo TEAM');
      }
      // Captain can only edit stats for players in their own team
      const targetMembership = await this.prisma.membership.findUnique({
        where: { userId_groupId: { userId: stat.playerId, groupId } },
      });
      if (!targetMembership || targetMembership.teamId !== actorMembership.teamId) {
        throw new ForbiddenException('Solo puedes editar estadísticas de jugadores de tu equipo');
      }
    }

    return this.prisma.playerMatchStats.update({
      where: { id: statId },
      data: dto,
      include: {
        player: { select: { id: true, displayName: true, avatarUrl: true } },
        team: { select: { id: true, name: true, color: true } },
      },
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
