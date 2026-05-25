import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from './r2.js';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const isR2Configured = () =>
  !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );

const uploadToR2 = async (file: File, folder = 'receipts'): Promise<string> => {
  const ext = path.extname(file.name) || '.jpg';
  const filename = `${folder}/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: file.type || 'image/jpeg',
    }),
  );

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
};

const uploadLocal = async (file: File): Promise<string> => {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}${path.extname(file.name) || '.jpg'}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
};

// Exportar una única función que decide internamente qué estrategia usar
export const uploadFile = (file: File): Promise<string> =>
  isR2Configured() ? uploadToR2(file) : uploadLocal(file);