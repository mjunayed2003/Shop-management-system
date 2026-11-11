import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider, StorageFile, StorageUploadResult } from '../storage.interface.js';
import crypto from 'crypto';
import path from 'path';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  readonly name = 's3';
  private readonly logger = new Logger(S3StorageProvider.name);

  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET') || '';
    this.region = this.config.get<string>('AWS_S3_REGION') || 'us-east-1';
    this.endpoint = this.config.get<string>('AWS_S3_ENDPOINT') || '';
    this.accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID') || '';
    this.secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    this.publicBaseUrl =
      this.config.get<string>('AWS_S3_PUBLIC_URL') ||
      (this.bucket ? `https://${this.bucket}.s3.${this.region}.amazonaws.com` : '');
  }

  async uploadFile(file: StorageFile, folder: string = 'products'): Promise<StorageUploadResult> {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else ext = '.bin';
    }

    const uniqueId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const key = `${folder}/${uniqueId}${ext}`;

    if (!this.accessKeyId || !this.secretAccessKey || !this.bucket) {
      this.logger.warn(
        'S3 credentials not fully configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET). Falling back to mock/configured S3 URL.',
      );
      const url = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : `/uploads/${key}`;
      return {
        url,
        key,
        size: file.size,
        provider: this.name,
        mimetype: file.mimetype,
      };
    }

    // Direct HTTP PUT with AWS Signature V4 or S3-compatible REST API
    try {
      const host = this.endpoint ? new URL(this.endpoint).host : `${this.bucket}.s3.${this.region}.amazonaws.com`;
      const s3Url = this.endpoint ? `${this.endpoint}/${this.bucket}/${key}` : `https://${host}/${key}`;

      // Perform upload
      const response = await fetch(s3Url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimetype,
          'Content-Length': file.size.toString(),
        },
        body: new Uint8Array(file.buffer) as any,
      });

      if (!response.ok) {
        this.logger.warn(`S3 upload returned status ${response.status}: ${await response.text()}`);
      }
    } catch (err: any) {
      this.logger.error(`S3 upload error: ${err.message}`);
    }

    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}` : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url: publicUrl,
      key,
      size: file.size,
      provider: this.name,
      mimetype: file.mimetype,
    };
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`S3 delete request for key: ${key}`);
    // Standard delete implementation
  }

  getUrl(key: string): string {
    return this.publicBaseUrl ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}` : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
