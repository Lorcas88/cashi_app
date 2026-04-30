import type { Context } from 'hono'
import { tagsRepository } from '../repositories/tags.repository.js'
import { createTagSchema } from '../schemas/notes.schema.js'
import { parsePrismaError } from '../lib/prisma-error.js'

// GET /tags
export const getTags = async (c: Context) => {
  const tags = await tagsRepository.findAll()
  return c.json(tags)
}

// GET /tags/:id
export const getTagById = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const tag = await tagsRepository.findById(id)
  if (!tag) return c.json({ error: 'Etiqueta no encontrada' }, 404)
  return c.json(tag)
}

// POST /tags
export const createTag = async (c: Context) => {
  const body = await c.req.json()
  const result = createTagSchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)
  try {
    const tag = await tagsRepository.create(result.data)
    return c.json(tag, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// DELETE /tags/:id
export const deleteTag = async (c: Context) => {
  const id = Number(c.req.param('id'))
  try {
    await tagsRepository.remove(id)
    return c.json({ message: 'Etiqueta eliminada' })
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}
