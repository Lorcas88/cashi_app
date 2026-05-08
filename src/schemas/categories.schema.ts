import * as z from 'zod'

// --- Category Schemas ---

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50)
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional()
})

// --- Types ---

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>