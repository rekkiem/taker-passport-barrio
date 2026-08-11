import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
});

const BUCKET_NAME = 'taker-media';

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) await minioClient.makeBucket(BUCKET_NAME);
}

export async function uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  await ensureBucket();
  await minioClient.putObject(BUCKET_NAME, filename, buffer, buffer.length, { 'Content-Type': mimetype });
  return `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${BUCKET_NAME}/${filename}`;
}