import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import categoriesRouter from './routes/categories.routes.js'
import transactionRouter from './routes/transactions.routes.js'

const app = new Hono()

// Health check (no auth required)
app.get('/', (c) => c.json({ status: 'ok', message: 'API de Finanzas — Cashi' }))

// Montar routers por recurso (protected)
app.route('/categories', categoriesRouter)
app.route('/transactions', transactionRouter)

const PORT = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
