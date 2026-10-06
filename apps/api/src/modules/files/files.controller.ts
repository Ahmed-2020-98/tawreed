import { Controller, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ErrorCode, type FileDto, uploadFileSchema } from '@tawreed/contracts';
import { CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { ZBody } from '../../common/http/zod.js';
import { FilesService } from './files.service.js';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @ZBody(uploadFileSchema) body: { purpose: FileDto['purpose'] },
    @CurrentActor() actor: Actor,
  ): Promise<FileDto> {
    if (!file?.buffer?.length) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: 'file', message: 'required' }] });
    const stored = await this.files.upload({ buffer: file.buffer, originalName: file.originalname, purpose: body.purpose, ownerUserId: actor.userId });
    return this.files.toDto(stored);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor): Promise<FileDto> {
    const file = await this.files.findOwned(id, actor.userId, actor.contextType === 'STAFF');
    return this.files.toDto(file);
  }
}
