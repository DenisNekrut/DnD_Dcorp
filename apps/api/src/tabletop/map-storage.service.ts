import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

type DetectedImage = { extension: 'png' | 'jpg' | 'webp'; contentType: string };

const MAX_MAP_SIZE = 15 * 1024 * 1024;

@Injectable()
export class MapStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBaseUrl: string | null;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const region = config.get<string>('S3_REGION') ?? 'auto';
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('S3_BUCKET') ?? null;
    this.publicBaseUrl = config.get<string>('S3_PUBLIC_BASE_URL')?.replace(/\/$/, '') ?? null;

    this.client = endpoint && accessKeyId && secretAccessKey && this.bucket && this.publicBaseUrl
      ? new S3Client({
          endpoint,
          region,
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
        })
      : null;
  }

  async upload(campaignId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('The uploaded map image is empty');
    }
    if (file.size > MAX_MAP_SIZE || file.buffer.length > MAX_MAP_SIZE) {
      throw new BadRequestException('Map image must be 15 MB or smaller');
    }

    const detected = this.detectImage(file.buffer);
    if (!detected) {
      throw new BadRequestException('Only PNG, JPEG and WebP map images are supported');
    }

    const { client, bucket, publicBaseUrl } = this.requireConfiguration();
    const key = `campaigns/${campaignId}/maps/${randomUUID()}.${detected.extension}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: detected.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return {
      key,
      url: `${publicBaseUrl}/${encodedKey}`,
      contentType: detected.contentType,
      size: file.buffer.length,
    };
  }

  async delete(campaignId: string, key: string): Promise<void> {
    const prefix = `campaigns/${campaignId}/maps/`;
    if (!key.startsWith(prefix) || key.includes('..') || key.includes('\\')) {
      throw new BadRequestException('Invalid map asset key');
    }

    const { client, bucket } = this.requireConfiguration();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  private requireConfiguration(): {
    client: S3Client;
    bucket: string;
    publicBaseUrl: string;
  } {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new ServiceUnavailableException(
        'Map storage is not configured. Configure the S3-compatible storage environment variables.',
      );
    }
    return {
      client: this.client,
      bucket: this.bucket,
      publicBaseUrl: this.publicBaseUrl,
    };
  }

  private detectImage(buffer: Buffer): DetectedImage | null {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature)) {
      return { extension: 'png', contentType: 'image/png' };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { extension: 'jpg', contentType: 'image/jpeg' };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { extension: 'webp', contentType: 'image/webp' };
    }
    return null;
  }
}
