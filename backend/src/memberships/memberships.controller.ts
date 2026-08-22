import { Controller, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { UpdateMembershipDto } from './memberships.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  findAll(@Param('groupId') groupId: string, @Request() req: any) {
    return this.membershipsService.findAll(groupId, req.user.sub);
  }

  @Patch(':userId')
  update(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMembershipDto,
    @Request() req: any,
  ) {
    return this.membershipsService.update(groupId, userId, req.user.sub, dto);
  }

  @Delete(':userId')
  remove(@Param('groupId') groupId: string, @Param('userId') userId: string, @Request() req: any) {
    return this.membershipsService.remove(groupId, userId, req.user.sub);
  }
}
