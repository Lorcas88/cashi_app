import { Hono } from 'hono'

import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBalance
} from '../controllers/transactions.controller.js'
import { uploadImage } from '../controllers/upload.controller.js'

const transactionsRouter = new Hono()

// Balance (debe ir antes de las rutas con parámetros para que no sea capturado por /:id)
transactionsRouter.get('/balance', getBalance)

// CRUD Transactions
transactionsRouter.post('/upload', uploadImage);
transactionsRouter.get('/', getTransactions)
transactionsRouter.get('/:id', getTransactionById)
transactionsRouter.post('/', createTransaction)
transactionsRouter.patch('/:id', updateTransaction)
transactionsRouter.delete('/:id', deleteTransaction)

export default transactionsRouter