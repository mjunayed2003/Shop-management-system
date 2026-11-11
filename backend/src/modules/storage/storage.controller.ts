import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service.js';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('api/v1/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: 'Upload an image file with active storage provider' })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: any,
    @Query('folder') folder: string = 'products',
  ) {
    if (!file) {
      throw new BadRequestException('Please provide an image file with key "image"');
    }

    const result = await this.storageService.uploadImage(file, folder || 'products');
    return {
      success: true,
      data: result,
    };
  }

  @ApiOperation({ summary: 'Get currently active storage provider' })
  @Get('provider')
  getProvider() {
    return {
      success: true,
      provider: this.storageService.getActiveProviderName(),
    };
  }

  @ApiOperation({ summary: 'Delete a stored file' })
  @Delete('file')
  async deleteFile(@Body('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required.');
    }
    await this.storageService.deleteFile(key);
    return { success: true, message: 'File deleted successfully.' };
  }
}
