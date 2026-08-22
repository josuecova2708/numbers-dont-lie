import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, JoinGroupDto, CustomizeInviteCodeDto } from './groups.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() dto: CreateGroupDto, @Request() req: any) {
    return this.groupsService.create(req.user.sub, dto);
  }

  @Get()
  findMyGroups(@Request() req: any) {
    return this.groupsService.findMyGroups(req.user.sub);
  }

  @Get(':groupId')
  findOne(@Param('groupId') groupId: string, @Request() req: any) {
    return this.groupsService.findOne(groupId, req.user.sub);
  }

  @Post('join')
  join(@Body() dto: JoinGroupDto, @Request() req: any) {
    return this.groupsService.join(req.user.sub, dto);
  }

  @Patch(':groupId')
  update(@Param('groupId') groupId: string, @Body() dto: UpdateGroupDto, @Request() req: any) {
    return this.groupsService.update(groupId, req.user.sub, dto);
  }

  @Post(':groupId/regenerate-code')
  regenerateCode(
    @Param('groupId') groupId: string,
    @Body() dto: CustomizeInviteCodeDto,
    @Request() req: any,
  ) {
    return this.groupsService.regenerateInviteCode(groupId, req.user.sub, dto);
  }

  @Delete(':groupId')
  remove(@Param('groupId') groupId: string, @Request() req: any) {
    return this.groupsService.remove(groupId, req.user.sub);
  }
}
