import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { LocalStorageProvider } from './providers/local-storage.provider.js';
import { S3StorageProvider } from './providers/s3-storage.provider.js';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider.js';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    LocalStorageProvider,
    S3StorageProvider,
    CloudinaryStorageProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}

