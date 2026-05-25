import { Hono } from 'hono'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categories.controller.js'

const categoriesRouter = new Hono()

categoriesRouter.get('/', getCategories)
categoriesRouter.get('/:id', getCategoryById)
categoriesRouter.post('/', createCategory)
categoriesRouter.patch('/:id', updateCategory)
categoriesRouter.delete('/:id', deleteCategory)

export default categoriesRouter