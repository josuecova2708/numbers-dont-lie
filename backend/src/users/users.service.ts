import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private safeSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect,
    });
  }

  async getHistoricalStats(userId: string) {
    const stats = await this.prisma.playerMatchStats.aggregate({
      where: { playerId: userId },
      _sum: {
        goals: true,
        assists: true,
        missedGoals: true,
        ownGoals: true,
        ballsOut: true,
      },
      _count: {
        _all: true,
      }
    });

    return {
      matchesPlayed: stats._count._all,
      goals: stats._sum.goals || 0,
      assists: stats._sum.assists || 0,
      missedGoals: stats._sum.missedGoals || 0,
      ownGoals: stats._sum.ownGoals || 0,
      ballsOut: stats._sum.ballsOut || 0,
    };
  }
}
