import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.s3 = new S3Client({ region: config.get('S3_REGION', 'us-east-1'), endpoint: config.get('S3_ENDPOINT') || undefined, forcePathStyle: config.get('S3_FORCE_PATH_STYLE', 'true') === 'true', credentials: { accessKeyId: config.getOrThrow('S3_ACCESS_KEY'), secretAccessKey: config.getOrThrow('S3_SECRET_KEY') } });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  async upload(documentId: string, actorId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'document';
    const key = `documents/${documentId}/${crypto.randomUUID()}-${safeName}`;
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, ContentLength: file.size }));
    const document = await this.prisma.document.update({ where: { id: documentId }, data: { storageKey: key, originalFilename: file.originalname, mimeType: file.mimetype, fileSize: file.size } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'FILE_UPLOADED', entity: 'Document', entityId: documentId, metadata: { filename: file.originalname, mimeType: file.mimetype, fileSize: file.size, source: 'web' } } });
    return document;
  }

  async getObject(key: string) { return this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key })); }
  async deleteObject(key: string) { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
}
