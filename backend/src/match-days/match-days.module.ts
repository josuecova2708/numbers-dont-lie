import { Module } from '@nestjs/common';
import { MatchDaysController } from './match-days.controller';
import { MatchDaysService } from './match-days.service';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [GroupsModule],
  controllers: [MatchDaysController],
  providers: [MatchDaysService],
  exports: [MatchDaysService],
})
export class MatchDaysModule {}
