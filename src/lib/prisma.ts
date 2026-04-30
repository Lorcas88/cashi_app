import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Singleton: una sola instancia de PrismaClient en toda la app.
// Prisma 7 requiere un driver adapter explícito.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

export const prisma = new PrismaClient({ adapter })
