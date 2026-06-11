import { prisma } from '../lib/prisma.js'

export interface CreateRefreshTokenData {
  token: string
  userId: number
  expiresAt: Date
}

export const refreshTokensRepository = {
  async create(data: CreateRefreshTokenData) {
    return prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    })
  },

  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })
  },

  async deleteByToken(token: string) {
    return prisma.refreshToken.deleteMany({
      where: { token },
    })
  },

  async deleteAllByUserId(userId: number) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    })
  },

  async deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  },
}
