import { prisma } from '../lib/prisma.js'
import type { CreateTagInput } from '../schemas/notes.schema.js'
import type { Tag } from '../generated/prisma/client.js'

interface TagRepository {
  findAll:  ()                       => Promise<Tag[]>
  findById: (id: number)             => Promise<Tag | null>
  create:   (data: CreateTagInput)   => Promise<Tag>
  remove:   (id: number)             => Promise<void>
}

export const tagsRepository: TagRepository = {
  findAll: () =>
    prisma.tag.findMany(),

  findById: (id) =>
    prisma.tag.findUnique({ where: { id } }),

  create: (data) =>
    prisma.tag.create({ data }),

  remove: (id) =>
    prisma.tag.delete({ where: { id } }).then(() => undefined)
}
