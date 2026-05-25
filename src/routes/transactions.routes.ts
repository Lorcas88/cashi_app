import { Hono } from 'hono'

import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBalance
} from '../controllers/transactions.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const transactionsRouter = new Hono()

// Balance (debe ir antes de las rutas con parámetros para que no sea capturado por /:id)
transactionsRouter.get('/balance', authMiddleware, getBalance)

// CRUD Transactions
transactionsRouter.get('/', authMiddleware, getTransactions)
transactionsRouter.get('/:id', authMiddleware, getTransactionById)
transactionsRouter.post('/', authMiddleware, createTransaction)
transactionsRouter.patch('/:id', authMiddleware, updateTransaction)
transactionsRouter.delete('/:id', authMiddleware, deleteTransaction)

export default transactionsRouter