import type { Context } from 'hono'
import { transactionsRepository } from '../repositories/transactions.repository.js'
import {
  createTransactionSchema,
  updateTransactionSchema
} from '../schemas/transactions.schema.js'
import { parsePrismaError } from '../lib/prisma-error.js'

// GET /transactions
export const getTransactions = async (c: Context) => {
  const transactions = await transactionsRepository.findAll()
  return c.json(transactions)
}

// GET /transactions/:id
export const getTransactionById = async (c: Context) => {
  const id = Number(c.req.param('id'))

  const transaction = await transactionsRepository.findById(id)
  if (!transaction) {
    return c.json({ error: 'Transacción no encontrada' }, 404)
  }

  return c.json(transaction)
}

// POST /transactions
export const createTransaction = async (c: Context) => {
  const body = await c.req.json()

  const result = createTransactionSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }

  try {
    const transaction = await transactionsRepository.create(result.data)
    return c.json(transaction, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// PATCH /transactions/:id
export const updateTransaction = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()

  const result = updateTransactionSchema.safeParse(body)
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }

  try {
    const updated = await transactionsRepository.update(id, result.data)
    return c.json(updated)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// DELETE /transactions/:id
export const deleteTransaction = async (c: Context) => {
  const id = Number(c.req.param('id'))

  try {
    await transactionsRepository.remove(id)
    return c.json({ message: 'Transacción eliminada' })
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

// GET /transactions/balance
export const getBalance = async (c: Context) => {
  const transactions = await transactionsRepository.findAll()

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)

  const balance = totalIncome - totalExpense

  return c.json({
    totalIncome,
    totalExpense,
    balance
  })
}