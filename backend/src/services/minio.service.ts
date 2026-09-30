import { Client } from 'minio';
function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} no está configurado.`);
  return value;
}
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.MINIO_USE_SSL === '1',
  accessKey: requireEnv('MINIO_ROOT_USER', process.env.MINIO_ROOT_USER),
  secretKey: requireEnv('MINIO_ROOT_PASSWORD', process.env.MINIO_ROOT_PASSWORD),
});
const BUCKET_NAME = 'taker-media';
let bucketReady = false;
export async function ensureBucket() {
  if (bucketReady) return;
  if (!(await minioClient.bucketExists(BUCKET_NAME))) await minioClient.makeBucket(BUCKET_NAME);
  bucketReady = true;
}
export async function uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  await ensureBucket();
  await minioClient.putObject(BUCKET_NAME, filename, buffer, buffer.length, { 'Content-Type': mimetype });
  return filename;
}
export async function getPresignedUrl(objectKey: string, expirySeconds = 300): Promise<string> {
  return minioClient.presignedGetObject(BUCKET_NAME, objectKey, expirySeconds);
}
