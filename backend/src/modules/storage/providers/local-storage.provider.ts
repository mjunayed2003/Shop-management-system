import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider, StorageFile, StorageUploadResult } from '../storage.interface.js';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseUploadDir: string;

  constructor() {
    this.baseUploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseUploadDir)) {
      fs.mkdirSync(this.baseUploadDir, { recursive: true });
    }
  }

  async uploadFile(file: StorageFile, folder: string = 'products'): Promise<StorageUploadResult> {
    const targetDir = path.join(this.baseUploadDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine extension
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else ext = '.bin';
    }

    const uniqueId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const filename = `${uniqueId}${ext}`;
    const filePath = path.join(targetDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const relativeUrl = `/uploads/${folder}/${filename}`;
    this.logger.log(`Uploaded file locally: ${relativeUrl} (${file.size} bytes)`);

    return {
      url: relativeUrl,
      key: `${folder}/${filename}`,
      size: file.size,
      provider: this.name,
      mimetype: file.mimetype,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const normalizedKey = key.replace(/^\/+/, '').replace(/^uploads\//, '');
    const filePath = path.join(this.baseUploadDir, normalizedKey);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.logger.log(`Deleted local file: ${filePath}`);
    }
  }

  getUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '').replace(/^uploads\//, '');
    return `/uploads/${normalizedKey}`;
  }
}

