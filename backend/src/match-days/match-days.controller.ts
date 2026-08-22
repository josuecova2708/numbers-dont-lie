import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MatchDaysService } from './match-days.service';
import { CreateMatchDayDto, UpdateMatchDayDto, GenerateRecurringDto } from './match-days.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/match-days')
export class MatchDaysController {
  constructor(private readonly matchDaysService: MatchDaysService) {}

  @Post()
  create(@Param('groupId') groupId: string, @Body() dto: CreateMatchDayDto, @Request() req: any) {
    return this.matchDaysService.create(groupId, req.user.sub, dto);
  }

  @Get()
  findAll(@Param('groupId') groupId: string, @Request() req: any) {
    return this.matchDaysService.findAll(groupId, req.user.sub);
  }

  @Get('active')
  getActive(@Param('groupId') groupId: string) {
    return this.matchDaysService.getActiveForGroup(groupId);
  }

  @Get(':matchDayId')
  findOne(@Param('groupId') groupId: string, @Param('matchDayId') matchDayId: string, @Request() req: any) {
    return this.matchDaysService.findOne(groupId, matchDayId, req.user.sub);
  }

  @Patch(':matchDayId')
  update(
    @Param('groupId') groupId: string,
    @Param('matchDayId') matchDayId: string,
    @Body() dto: UpdateMatchDayDto,
    @Request() req: any,
  ) {
    return this.matchDaysService.update(groupId, matchDayId, req.user.sub, dto);
  }

  @Post('generate-recurring')
  generateRecurring(@Param('groupId') groupId: string, @Body() dto: GenerateRecurringDto, @Request() req: any) {
    return this.matchDaysService.generateRecurring(groupId, req.user.sub, dto);
  }
}
