export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
  provider: string;
  mimetype: string;
}

export interface IStorageProvider {
  readonly name: string;
  uploadFile(file: StorageFile, folder?: string): Promise<StorageUploadResult>;
  deleteFile(key: string): Promise<void>;
  getUrl(key: string): string;
}

