import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { UpdateMembershipDto } from './memberships.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  async findAll(groupId: string, userId: string) {
    await this.groupsService.assertMember(userId, groupId);
    return this.prisma.membership.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async update(groupId: string, targetUserId: string, actorId: string, dto: UpdateMembershipDto) {
    await this.groupsService.assertOrganizer(actorId, groupId);

    const membership = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!membership) throw new NotFoundException('El usuario no es miembro de este grupo');

    return this.prisma.membership.update({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      data: dto,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async remove(groupId: string, targetUserId: string, actorId: string) {
    await this.groupsService.assertOrganizer(actorId, groupId);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!membership) throw new NotFoundException('El usuario no es miembro de este grupo');
    await this.prisma.membership.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
  }
}
