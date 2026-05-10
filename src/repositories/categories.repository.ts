import { prisma } from '../lib/prisma.js'
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/categories.schema.js'
import type { Prisma, Category } from '../generated/prisma/client.js'

export type CategoryWithTransactions = Prisma.CategoryGetPayload<{
  include: { transactions: true }
}>

interface CategoryRepository {
  findAll:  ()                          => Promise<Category[]>
  findById: (id: number)                => Promise<CategoryWithTransactions | null>
  create:   (data: CreateCategoryInput) => Promise<Category>
  update:   (id: number, data: UpdateCategoryInput) => Promise<Category>
  remove:   (id: number)                => Promise<void>
}

export const categoriesRepository: CategoryRepository = {
  findAll: () =>
    prisma.category.findMany(),

  findById: (id) =>
    prisma.category.findUnique({ 
      where: { id },
      include: { transactions: true }
    }),

  create: (data) =>
    prisma.category.create({ data }),

  update: (id, data) =>
    prisma.category.update({
      where: { id },
      data
    }),

  remove: (id) =>
    prisma.category.delete({ where: { id } }).then(() => undefined)
}
