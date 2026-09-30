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
  return filename; // se guarda solo la key: el bucket es privado, no una URL pública real
}

/**
 * Genera una URL temporal (5 minutos por defecto) para que un admin pueda
 * ver un documento privado sin hacer público el bucket completo — clave
 * para documentos de identidad (cédula, selfie).
 */
export async function getPresignedUrl(objectKey: string, expirySeconds = 300): Promise<string> {
  return minioClient.presignedGetObject(BUCKET_NAME, objectKey, expirySeconds);
}