import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly maxFileSize: number;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('s3.endpoint');
    const region = this.config.get<string>('s3.region', 'us-east-1');
    const accessKeyId = this.config.get<string>('s3.accessKeyId');
    const secretAccessKey = this.config.get<string>('s3.secretAccessKey');
    const bucket = this.config.get<string>('s3.bucket');

    this.bucket = bucket || null;
    this.maxFileSize = this.config.get<number>('s3.maxFileSizeMb', 20) * 1024 * 1024;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      this.client = null;
      return;
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

  private assertConfigured(): { client: S3Client; bucket: string } {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException('S3 storage is not configured');
    }
    return { client: this.client, bucket: this.bucket };
  }

  async putObject(input: { key: string; body: Buffer; contentType: string }) {
    if (input.body.length > this.maxFileSize) {
      throw new ServiceUnavailableException(
        `File exceeds maximum size of ${this.maxFileSize / 1024 / 1024} MB`,
      );
    }

    const { client, bucket } = this.assertConfigured();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }));

    return { key: input.key };
  }

  async getDownloadUrl(key: string, expiresIn = 300) {
    const { client, bucket } = this.assertConfigured();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  async deleteObject(key: string) {
    const { client, bucket } = this.assertConfigured();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
