import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private logger = new Logger(MinioService.name);
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET')!;
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
      port: parseInt(this.configService.get<string>('MINIO_PORT', '443')!, 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!,
    });
  }

  async uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        
        // Make bucket public so images can be viewed
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['s3:GetObject'],
              Effect: 'Allow',
              Principal: '*',
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }

      const metaData = {
        'Content-Type': mimetype,
      };

      await this.minioClient.putObject(this.bucketName, filename, buffer, buffer.length, metaData);

      const endPoint = this.configService.get<string>('MINIO_ENDPOINT');
      const port = this.configService.get<string>('MINIO_PORT');
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      
      const portString = (port === '80' || port === '443') ? '' : `:${port}`;
      return `${protocol}://${endPoint}${portString}/${this.bucketName}/${filename}`;
    } catch (error: any) {
      this.logger.error(`Error uploading file to Minio: ${error.message}`);
      throw error;
    }
  }
}
