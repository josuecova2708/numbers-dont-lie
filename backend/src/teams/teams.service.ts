import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateTeamDto, UpdateTeamDto } from './teams.dto';

const MAX_TEAMS_PER_GROUP = 10;

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  async create(groupId: string, userId: string, dto: CreateTeamDto) {
    await this.groupsService.assertOrganizer(userId, groupId);

    const count = await this.prisma.team.count({ where: { groupId } });
    if (count >= MAX_TEAMS_PER_GROUP) {
      throw new BadRequestException(`El grupo ya tiene el máximo de ${MAX_TEAMS_PER_GROUP} equipos`);
    }

    return this.prisma.team.create({
      data: { ...dto, groupId },
    });
  }

  async findAll(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    return this.prisma.team.findMany({
      where: { groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { stats: true } },
      },
    });
  }

  async update(groupId: string, teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.groupsService.assertOrganizer(userId, groupId);
    return this.prisma.team.update({ where: { id: teamId }, data: dto });
  }

  async remove(groupId: string, teamId: string, userId: string) {
    await this.groupsService.assertOrganizer(userId, groupId);
    await this.prisma.team.delete({ where: { id: teamId } });
  }
}
