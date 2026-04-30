import { prisma } from '../lib/prisma.js'
import type { CreateCategoryInput } from '../schemas/notes.schema.js'
import type { Category } from '../generated/prisma/client.js'

interface CategoryRepository {
  findAll:  ()                          => Promise<Category[]>
  findById: (id: number)                => Promise<Category | null>
  create:   (data: CreateCategoryInput) => Promise<Category>
  remove:   (id: number)                => Promise<void>
}

export const categoriesRepository: CategoryRepository = {
  findAll: () =>
    prisma.category.findMany(),

  findById: (id) =>
    prisma.category.findUnique({ where: { id } }),

  create: (data) =>
    prisma.category.create({ data }),

  remove: (id) =>
    prisma.category.delete({ where: { id } }).then(() => undefined)
}
