import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './teams.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Param('groupId') groupId: string, @Body() dto: CreateTeamDto, @Request() req: any) {
    return this.teamsService.create(groupId, req.user.sub, dto);
  }

  @Get()
  findAll(@Param('groupId') groupId: string, @Request() req: any) {
    return this.teamsService.findAll(groupId, req.user.sub);
  }

  @Patch(':teamId')
  update(
    @Param('groupId') groupId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.update(groupId, teamId, req.user.sub, dto);
  }

  @Delete(':teamId')
  remove(@Param('groupId') groupId: string, @Param('teamId') teamId: string, @Request() req: any) {
    return this.teamsService.remove(groupId, teamId, req.user.sub);
  }
}
