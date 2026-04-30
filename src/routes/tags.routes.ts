import { Hono } from 'hono'
import {
  getTags,
  getTagById,
  createTag,
  deleteTag
} from '../controllers/tags.controller.js'

const tagsRouter = new Hono()

tagsRouter.get('/',     getTags)
tagsRouter.get('/:id',  getTagById)
tagsRouter.post('/',    createTag)
tagsRouter.delete('/:id', deleteTag)

export default tagsRouter
