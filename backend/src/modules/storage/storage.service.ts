import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider, StorageFile, StorageUploadResult } from './storage.interface.js';
import { LocalStorageProvider } from './providers/local-storage.provider.js';
import { S3StorageProvider } from './providers/s3-storage.provider.js';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider.js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly providers: Map<string, IStorageProvider> = new Map();
  private activeProvider: IStorageProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
    private readonly cloudinaryProvider: CloudinaryStorageProvider,
  ) {
    this.providers.set('local', this.localProvider);
    this.providers.set('s3', this.s3Provider);
    this.providers.set('cloudinary', this.cloudinaryProvider);

    const configuredProvider = (this.config.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    this.activeProvider = this.providers.get(configuredProvider) || this.localProvider;

    this.logger.log(`Active Storage Provider initialized as: [${this.activeProvider.name}]`);
  }

  getActiveProviderName(): string {
    return this.activeProvider.name;
  }

  setProvider(name: string): void {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new BadRequestException(`Unknown storage provider: ${name}`);
    }
    this.activeProvider = provider;
    this.logger.log(`Switched active storage provider to: [${provider.name}]`);
  }

  async uploadImage(file: any, folder: string = 'products'): Promise<StorageUploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP, GIF, SVG.`,
      );
    }

    // Max 10MB limit safety check (client usually compresses it to < 100KB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the 10MB maximum limit.');
    }

    const storageFile: StorageFile = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    return this.activeProvider.uploadFile(storageFile, folder);
  }

  async deleteFile(key: string): Promise<void> {
    return this.activeProvider.deleteFile(key);
  }
}

