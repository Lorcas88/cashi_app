import { prisma } from '../lib/prisma.js'
import type { Prisma, User } from '../generated/prisma/client.js'

interface UserRepository {
  findByEmail: (email: string) => Promise<User | null>
  create: (data: Prisma.UserCreateInput) => Promise<User>
}

export const usersRepository: UserRepository = {
  findByEmail: (email) =>
    prisma.user.findUnique({
      where: { email }
    }),

  create: (data) =>
    prisma.user.create({
      data
    })
}