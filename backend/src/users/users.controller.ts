import { Controller, Get, Patch, Post, Param, Body, UseGuards, Request, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UsersService, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../minio/minio.service';
import sharp from 'sharp';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  @Get('me/stats')
  getStats(@Request() req: any) {
    return this.usersService.getHistoricalStats(req.user.sub);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No se encontró el archivo');

    // Procesar la imagen con sharp
    const optimizedBuffer = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `avatar-${req.user.sub}-${Date.now()}.webp`;
    const avatarUrl = await this.minioService.uploadFile(optimizedBuffer, filename, 'image/webp');

    // Actualizar el usuario
    return this.usersService.update(req.user.sub, { avatarUrl });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
    if (req.user.sub !== id) throw new ForbiddenException('Solo puedes editar tu propio perfil');
    return this.usersService.update(id, dto);
  }
}
