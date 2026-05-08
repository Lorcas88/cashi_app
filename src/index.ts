import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import notesRouter      from './routes/notes.routes.js'
import categoriesRouter from './routes/categories.routes.js'
import tagsRouter       from './routes/tags.routes.js'

const app = new Hono()

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: 'API de Finanzas — Cashi' }))

// Montar routers por recurso
app.route('/notes',      notesRouter)
app.route('/categories', categoriesRouter)
app.route('/tags',       tagsRouter)

const PORT = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
