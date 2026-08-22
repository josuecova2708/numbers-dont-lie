import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { GroupsModule } from '../groups/groups.module';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [GroupsModule, MembershipsModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
