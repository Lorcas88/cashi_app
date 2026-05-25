import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const jwtSecret = process.env.JWT_SECRET!
    const payload = await verify(token, jwtSecret, 'HS256') as { userId: number }

    c.set('userId', payload.userId)

    await next()
  } catch {
    return c.json({ error: 'Token inválido' }, 401)
  }
}