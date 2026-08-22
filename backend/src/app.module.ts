import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { TeamsModule } from './teams/teams.module';
import { MembershipsModule } from './memberships/memberships.module';
import { MatchDaysModule } from './match-days/match-days.module';
import { StatsModule } from './stats/stats.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MinioModule,
    UsersModule,
    GroupsModule,
    TeamsModule,
    MembershipsModule,
    MatchDaysModule,
    StatsModule,
    LeaderboardsModule,
  ],
})
export class AppModule {}
