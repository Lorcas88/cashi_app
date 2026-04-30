import type { Context } from 'hono'
import { categoriesRepository } from '../repositories/categories.repository.js'
import { createCategorySchema } from '../schemas/notes.schema.js'
import { parsePrismaError } from '../lib/prisma-error.js'

// GET /categories
export const getCategories = async (c: Context) => {
  const categories = await categoriesRepository.findAll()
  return c.json(categories)
}

// GET /categories/:id
export const getCategoryById = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const category = await categoriesRepository.findById(id)
  if (!category) return c.json({ error: 'Categoría no encontrada' }, 404)
  return c.json(category)
}

// POST /categories
export const createCategory = async (c: Context) => {
  const body = await c.req.json()
  const result = createCategorySchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)
  try {
    const category = await categoriesRepository.create(result.data)
    return c.json(category, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// DELETE /categories/:id
export const deleteCategory = async (c: Context) => {
  const id = Number(c.req.param('id'))
  try {
    await categoriesRepository.remove(id)
    return c.json({ message: 'Categoría eliminada' })
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}
