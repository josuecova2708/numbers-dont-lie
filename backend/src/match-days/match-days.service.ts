import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateMatchDayDto, UpdateMatchDayDto, GenerateRecurringDto } from './match-days.dto';
import { MatchDay, MatchDayStatus } from '@prisma/client';
import {
  acceptsStats,
  formatMatchDayLabel,
  localDateKey,
  localNoon,
  missingRecurringDates,
  pickCurrentMatchDay,
} from './match-day-dates';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class MatchDaysService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  /** Agrega campos calculados que el frontend necesita para no razonar con zonas horarias. */
  private withMeta<T extends MatchDay>(md: T) {
    return { ...md, dateKey: localDateKey(md.date), acceptsStats: acceptsStats(md) };
  }

  /** Crea las jornadas recurrentes que falten (pasadas recientes y próximas 4 semanas). */
  async ensureRecurring(groupId: string, weeksAhead = 4) {
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    if (group.recurrenceDay === null || group.recurrenceDay === undefined) return;

    const existing = await this.prisma.matchDay.findMany({ where: { groupId }, select: { date: true } });
    const keys = missingRecurringDates(
      existing.map((m) => m.date),
      group.recurrenceDay,
      new Date(),
      undefined,
      weeksAhead,
    );
    if (keys.length === 0) return;

    await this.prisma.matchDay.createMany({
      data: keys.map((key) => ({
        groupId,
        label: formatMatchDayLabel(key),
        date: localNoon(key),
        status: MatchDayStatus.SCHEDULED,
      })),
      skipDuplicates: true,
    });
  }

  async create(groupId: string, userId: string, dto: CreateMatchDayDto) {
    await this.groupsService.assertOrganizer(userId, groupId);

    const key = DATE_ONLY.test(dto.date) ? dto.date : localDateKey(new Date(dto.date));
    const existing = await this.prisma.matchDay.findMany({ where: { groupId }, select: { date: true } });
    if (existing.some((m) => localDateKey(m.date) === key)) {
      throw new ConflictException('Ya existe una jornada para ese día');
    }

    const md = await this.prisma.matchDay.create({
      data: {
        groupId,
        label: dto.label,
        date: localNoon(key),
        status: dto.status || MatchDayStatus.SCHEDULED,
      },
    });
    return this.withMeta(md);
  }

  async findAll(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    await this.ensureRecurring(groupId);
    const mds = await this.prisma.matchDay.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { stats: true } },
      },
    });
    return mds.map((md) => this.withMeta(md));
  }

  async findOne(groupId: string, matchDayId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    const md = await this.prisma.matchDay.findUnique({
      where: { id: matchDayId },
      include: {
        stats: {
          include: {
            player: { select: { id: true, displayName: true, avatarUrl: true } },
            team: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { stats: true } },
      },
    });
    if (!md || md.groupId !== groupId) throw new NotFoundException('Jornada no encontrada');
    return this.withMeta(md);
  }

  async update(groupId: string, matchDayId: string, userId: string, dto: UpdateMatchDayDto) {
    await this.groupsService.assertOrganizer(userId, groupId);
    const md = await this.prisma.matchDay.findUnique({ where: { id: matchDayId } });
    if (!md || md.groupId !== groupId) throw new NotFoundException('Jornada no encontrada');
    const updated = await this.prisma.matchDay.update({
      where: { id: matchDayId },
      data: dto,
    });
    return this.withMeta(updated);
  }

  async generateRecurring(groupId: string, userId: string, dto: GenerateRecurringDto) {
    await this.groupsService.assertOrganizer(userId, groupId);

    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    if (group.recurrenceDay === null || group.recurrenceDay === undefined) {
      throw new BadRequestException('El grupo no tiene un día de recurrencia configurado');
    }

    await this.ensureRecurring(groupId, dto.weeksAhead);
    const mds = await this.prisma.matchDay.findMany({
      where: { groupId, date: { gte: localNoon(localDateKey(new Date())) } },
      orderBy: { date: 'asc' },
    });
    return mds.map((md) => this.withMeta(md));
  }

  /** Jornada para la que se cargan stats por defecto. No cambia estados ni vence. */
  async getActiveForGroup(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    await this.ensureRecurring(groupId);
    const mds = await this.prisma.matchDay.findMany({ where: { groupId } });
    const current = pickCurrentMatchDay(mds);
    return current ? this.withMeta(current) : null;
  }
}
