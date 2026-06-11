import type { Context } from 'hono'
import { usersRepository } from '../repositories/users.repository.js'
import { refreshTokensRepository } from '../repositories/refresh-tokens.repository.js'
import { registerSchema, loginSchema } from '../schemas/auth.schema.js'
import * as bcrypt from 'bcryptjs'
import { sign, verify } from 'hono/jwt'
import { parsePrismaError } from '../lib/prisma-error.js'
import { randomBytes } from 'crypto'

const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 // 30 days in seconds

const generateRefreshToken = () => randomBytes(40).toString('hex')

const createTokens = async (userId: number, email: string) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined')
  }

  const accessToken = await sign(
    {
      userId,
      email,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY,
    },
    jwtSecret
  )

  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000)

  await refreshTokensRepository.create({
    token: refreshToken,
    userId,
    expiresAt,
  })

  return { accessToken, refreshToken }
}

// POST /auth/register
export const register = async (c: Context) => {
  const body = await c.req.json()
  const result = registerSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }

  const { email, password } = result.data

  try {
    const existingUser = await usersRepository.findByEmail(email)
    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await usersRepository.create({
      email,
      passwordHash,
    })

    const tokens = await createTokens(user.id, user.email)

    return c.json(tokens, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// POST /auth/login
export const login = async (c: Context) => {
  const body = await c.req.json()

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }

  const { email, password } = result.data

  try {
    const user = await usersRepository.findByEmail(email)
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const tokens = await createTokens(user.id, user.email)

    return c.json(tokens)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// POST /auth/refresh
export const refresh = async (c: Context) => {
  const body = await c.req.json()
  const { refreshToken } = body

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }

  try {
    const storedToken = await refreshTokensRepository.findByToken(refreshToken)

    if (!storedToken) {
      return c.json({ error: 'Invalid refresh token' }, 401)
    }

    if (new Date() > storedToken.expiresAt) {
      await refreshTokensRepository.deleteByToken(refreshToken)
      return c.json({ error: 'Refresh token expired' }, 401)
    }

    await refreshTokensRepository.deleteByToken(refreshToken)

    const tokens = await createTokens(storedToken.user.id, storedToken.user.email)

    return c.json(tokens)
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
}

// POST /auth/logout
export const logout = async (c: Context) => {
  const body = await c.req.json()
  const { refreshToken } = body

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }

  try {
    await refreshTokensRepository.deleteByToken(refreshToken)
    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    return c.json({ error: 'Logout failed' }, 500)
  }
}
