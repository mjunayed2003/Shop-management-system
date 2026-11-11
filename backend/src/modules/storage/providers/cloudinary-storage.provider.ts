import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider, StorageFile, StorageUploadResult } from '../storage.interface.js';
import crypto from 'crypto';

@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  readonly name = 'cloudinary';
  private readonly logger = new Logger(CloudinaryStorageProvider.name);

  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadPreset: string;

  constructor(private readonly config: ConfigService) {
    this.cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME') || '';
    this.apiKey = this.config.get<string>('CLOUDINARY_API_KEY') || '';
    this.apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET') || '';
    this.uploadPreset = this.config.get<string>('CLOUDINARY_UPLOAD_PRESET') || '';
  }

  async uploadFile(file: StorageFile, folder: string = 'products'): Promise<StorageUploadResult> {
    const uniqueId = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!this.cloudName) {
      this.logger.warn('Cloudinary not fully configured (CLOUDINARY_CLOUD_NAME). Using placeholder response.');
      return {
        url: `https://res.cloudinary.com/demo/image/upload/${folder}/${uniqueId}.webp`,
        key: `${folder}/${uniqueId}`,
        size: file.size,
        provider: this.name,
        mimetype: file.mimetype,
      };
    }

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('folder', folder);

      if (this.uploadPreset) {
        formData.append('upload_preset', this.uploadPreset);
      } else if (this.apiKey && this.apiSecret) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureStr = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
        const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');
        formData.append('api_key', this.apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cloudinary upload failed: ${errText}`);
      }

      const data: any = await res.json();
      return {
        url: data.secure_url || data.url,
        key: data.public_id,
        size: data.bytes || file.size,
        provider: this.name,
        mimetype: file.mimetype,
      };
    } catch (err: any) {
      this.logger.error(`Cloudinary error: ${err.message}`);
      throw err;
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Cloudinary delete called for public_id: ${key}`);
  }

  getUrl(key: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${key}`;
  }
}
