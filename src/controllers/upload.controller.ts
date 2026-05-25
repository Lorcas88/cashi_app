import type { Context } from 'hono';
import { uploadFile } from '../lib/upload.js';

// POST /transactions/upload
export const uploadImage = async (c: Context) => {
  const body = await c.req.parseBody()
  const file = body['receipt'];
  if (!file || typeof file === 'string') {
    return c.json(
      { error: 'Se requiere un archivo de imagen en el campo "receipt"' },
      400,
    );
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: 'Tipo de archivo no permitido. Usa JPEG, PNG o WebP' },
      422,
    );
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'El archivo supera el límite de 5 MB' }, 422);
  }

  const imageUrl = await uploadFile(file);
  return c.json({ receiptUrl: imageUrl });

};