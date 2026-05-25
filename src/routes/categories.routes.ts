import { Hono } from 'hono'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categories.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const categoriesRouter = new Hono()

categoriesRouter.get('/', authMiddleware, getCategories)
categoriesRouter.get('/:id', authMiddleware, getCategoryById)
categoriesRouter.post('/', authMiddleware, createCategory)
categoriesRouter.patch('/:id', authMiddleware, updateCategory)
categoriesRouter.delete('/:id', authMiddleware, deleteCategory)

export default categoriesRouter