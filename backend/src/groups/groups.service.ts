import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, JoinGroupDto, CustomizeInviteCodeDto } from './groups.dto';
import { GroupRole } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  private generateInviteCode(name: string): string {
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${slug}-${suffix}`;
  }

  async create(userId: string, dto: CreateGroupDto) {
    let inviteCode = dto.inviteCode?.toUpperCase() || this.generateInviteCode(dto.name);

    // Check unique invite code
    const existing = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (existing) {
      if (dto.inviteCode) throw new ConflictException('Ese código ya está en uso');
      inviteCode = this.generateInviteCode(dto.name); // regenerate if auto-conflict
    }

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        inviteCode,
        recurrenceDay: dto.recurrenceDay,
        memberships: {
          create: {
            userId,
            role: GroupRole.ORGANIZER,
          },
        },
      },
      include: {
        teams: true,
        memberships: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
      },
    });

    // Auto-generate upcoming match days if recurrence is set
    if (dto.recurrenceDay !== undefined && dto.recurrenceDay !== null) {
      const targetDay = dto.recurrenceDay;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];

      for (let week = 0; week < 4; week++) {
        const d = new Date(today);
        const currentDay = d.getDay();
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0 && week === 0) daysUntilTarget = 0;
        d.setDate(d.getDate() + daysUntilTarget + week * 7);
        d.setHours(12, 0, 0, 0);

        const label = `Jornada - ${dayNames[d.getDay()]} ${d.getDate()} de ${monthNames[d.getMonth()]}`;
        try {
          await this.prisma.matchDay.create({
            data: {
              groupId: group.id,
              label,
              date: d,
              status: week === 0 ? 'ACTIVE' : 'SCHEDULED', // First one active!
            },
          });
        } catch {}
      }
    }

    return {
      ...group,
      myRole: GroupRole.ORGANIZER,
    };
  }

  async findMyGroups(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            teams: true,
            _count: { select: { memberships: true, matchDays: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({ ...m.group, myRole: m.role, myTeamId: m.teamId }));
  }

  async findOne(groupId: string, userId: string) {
    const member = await this.assertMember(userId, groupId);
    const group = await this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      include: {
        teams: true,
        memberships: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            team: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { matchDays: true } },
      },
    });
    return {
      ...group,
      myRole: member.role,
      myTeamId: member.teamId,
    };
  }

  async join(userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode: dto.inviteCode.toUpperCase() } });
    if (!group) throw new NotFoundException('Código de invitación inválido');

    const existing = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });
    if (existing) throw new ConflictException('Ya eres miembro de este grupo');

    await this.prisma.membership.create({
      data: { userId, groupId: group.id, role: GroupRole.PLAYER },
    });
    return { message: 'Te uniste al grupo exitosamente', groupId: group.id, groupName: group.name };
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.assertOrganizer(userId, groupId);
    return this.prisma.group.update({
      where: { id: groupId },
      data: dto,
    });
  }

  async regenerateInviteCode(groupId: string, userId: string, dto?: CustomizeInviteCodeDto) {
    await this.assertOrganizer(userId, groupId);
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });

    let newCode = dto?.inviteCode?.toUpperCase() || this.generateInviteCode(group.name);
    const conflict = await this.prisma.group.findUnique({ where: { inviteCode: newCode } });
    if (conflict && conflict.id !== groupId) {
      if (dto?.inviteCode) throw new ConflictException('Ese código ya está en uso');
      newCode = this.generateInviteCode(group.name);
    }

    return this.prisma.group.update({ where: { id: groupId }, data: { inviteCode: newCode } });
  }

  async remove(groupId: string, userId: string) {
    await this.assertOrganizer(userId, groupId);
    await this.prisma.group.delete({ where: { id: groupId } });
  }

  // ─── Helpers ────────────────────────────────────────────
  async assertMember(userId: string, groupId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!m) throw new ForbiddenException('No eres miembro de este grupo');
    return m;
  }

  async assertOrganizer(userId: string, groupId: string) {
    const m = await this.assertMember(userId, groupId);
    if (m.role !== GroupRole.ORGANIZER) throw new ForbiddenException('Solo el organizador puede hacer esto');
    return m;
  }

  async getUserRole(userId: string, groupId: string): Promise<GroupRole | null> {
    const m = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return m?.role ?? null;
  }
}
