import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly maxFileSize: number;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('s3.endpoint');
    const region = this.config.get<string>('s3.region', 'us-east-1');
    const accessKeyId = this.config.get<string>('s3.accessKeyId');
    const secretAccessKey = this.config.get<string>('s3.secretAccessKey');
    this.bucket = this.config.get<string>('s3.bucket', '');
    this.maxFileSize = this.config.get<number>('s3.maxFileSizeMb', 20) * 1024 * 1024;

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new InternalServerErrorException('S3 storage configuration is incomplete');
    }

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: this.config.get<boolean>('s3.forcePathStyle', true),
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  getMaxFileSize() {
    return this.maxFileSize;
  }

  async putObject(input: { key: string; body: Buffer; contentType: string }) {
    if (input.body.length > this.maxFileSize) {
      throw new Error(`File exceeds maximum size of ${this.maxFileSize / 1024 / 1024} MB`);
    }

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }));

    return { key: input.key };
  }

  async getDownloadUrl(key: string, expiresIn = 300) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
