import { Hono } from 'hono'
import { register, login, refresh, logout } from '../controllers/auth.controller.js'

const authRouter = new Hono()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/refresh', refresh)
authRouter.post('/logout', logout)

export default authRouter
