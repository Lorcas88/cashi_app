import type { Context } from 'hono'
import { usersRepository } from '../repositories/users.repository.js'
import { registerSchema, loginSchema } from '../schemas/auth.schema.js'
import * as bcrypt from 'bcryptjs'
import { sign } from 'hono/jwt'
import { parsePrismaError } from '../lib/prisma-error.js'

// POST /auth/register
export const register = async (c: Context) => {
  const body = await c.req.json()
  // Register user
  const result = registerSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }
  
  // Object destructuring
  const { email, password } = result.data
  
  try {
    // Check if user already exists
    const existingUser = await usersRepository.findByEmail(email)
    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409)
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Create user
    const user = await usersRepository.create({
      email,
      passwordHash
    })
    
    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined')
    }
    
    // Sign the token
    const token = await sign({ userId: user.id, email: user.email }, jwtSecret)
    
    return c.json({ token }, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// POST /auth/login
export const login = async (c: Context) => {
  const body = await c.req.json()
  
  // Call the login method and verify the result
  const result = loginSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }
  
  // Object destructuring
  const { email, password } = result.data
  
  // Generate JWT
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined')
  }
    

  try {
    // Find user by email
    const user = await usersRepository.findByEmail(email)
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    const token = await sign({ userId: user.id, email: user.email }, jwtSecret)
    
    return c.json({ token })
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}