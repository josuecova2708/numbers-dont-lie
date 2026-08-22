import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateMatchDayDto, UpdateMatchDayDto, GenerateRecurringDto } from './match-days.dto';
import { MatchDayStatus } from '@prisma/client';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Injectable()
export class MatchDaysService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  private formatLabel(date: Date): string {
    const day = DAY_NAMES[date.getDay()];
    const num = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    return `Jornada - ${day} ${num} de ${month}`;
  }

  async create(groupId: string, userId: string, dto: CreateMatchDayDto) {
    await this.groupsService.assertOrganizer(userId, groupId);
    return this.prisma.matchDay.create({
      data: {
        groupId,
        label: dto.label,
        date: new Date(dto.date),
        status: dto.status || MatchDayStatus.SCHEDULED,
      },
    });
  }

  async findAll(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    return this.prisma.matchDay.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { stats: true } },
      },
    });
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
    return md;
  }

  async update(groupId: string, matchDayId: string, userId: string, dto: UpdateMatchDayDto) {
    await this.groupsService.assertOrganizer(userId, groupId);
    return this.prisma.matchDay.update({
      where: { id: matchDayId },
      data: dto,
    });
  }

  async generateRecurring(groupId: string, userId: string, dto: GenerateRecurringDto) {
    await this.groupsService.assertOrganizer(userId, groupId);

    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    if (group.recurrenceDay === null || group.recurrenceDay === undefined) {
      throw new BadRequestException('El grupo no tiene un día de recurrencia configurado');
    }

    const targetDay = group.recurrenceDay; // 0-6
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week < dto.weeksAhead; week++) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0 && week === 0) daysUntilTarget = 0;
      d.setDate(d.getDate() + daysUntilTarget + week * 7);
      d.setHours(12, 0, 0, 0);
      dates.push(d);
    }

    // Upsert to avoid duplicates
    const created: any[] = [];
    for (const date of dates) {
      try {
        const md = await this.prisma.matchDay.upsert({
          where: { groupId_date: { groupId, date } },
          create: {
            groupId,
            label: this.formatLabel(date),
            date,
            status: MatchDayStatus.SCHEDULED,
          },
          update: {}, // Don't overwrite existing
        });
        created.push(md);
      } catch {}
    }

    return created;
  }

  async getActiveForGroup(groupId: string) {
    return this.prisma.matchDay.findFirst({
      where: { groupId, status: MatchDayStatus.ACTIVE },
      orderBy: { date: 'desc' },
    });
  }
}
