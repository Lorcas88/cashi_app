# Implementación de Evaluación Unidad 3 - Autenticación y Comprobantes

## Objetivo
Implementar autenticación JWT con bcrypt, transacciones por usuario y subida de comprobantes en la API Cashi, manteniendo la arquitectura N-Layer existente.

## Requisitos Analizados
1. **Modelo de Datos**
   - Nuevo modelo User: id, email (único), passwordHash, createdAt
   - Extender Transaction: receiptUrl, latitude, longitude, userId (FK a User)
   - Categorías permanecen globales

2. **Autenticación**
   - POST /auth/register (registro con hash de contraseña, devuelve JWT)
   - POST /auth/login (login con verificación de contraseña, devuelve JWT)
   - Middleware de autenticación para proteger rutas (excepto /auth/*)
   - Passwords hasheados con bcrypt (nunca texto plano)
   - JWT generado y verificado correctamente

3. **Transacciones por Usuario**
   - GET /transactions retorna solo transacciones del usuario autenticado
   - GET /transactions/balance calcula balance solo del usuario autenticado
   - Al crear transacción, userId se toma del token (no del body)
   - Ownership check en controller: 403 si usuario intenta acceder a transacción ajena

4. **Subida de Comprobante**
   - POST /transactions/upload (recibe imagen multipart/form-data, devuelve URL)
   - Validaciones: JPEG/PNG/WebP, máximo 5MB
   - Almacenamiento local (uploads/) o Cloudflare R2
   - URL devuelta se usa en campo receiptUrl de transacciones

## Capas Afectadas
1. **Prisma Schema** - Agregar modelo User y extender Transaction
2. **Repositories** - Actualizar para manejar relaciones User-Transaction
3. **Controllers** - 
   - Nuevos auth.controller.ts para register/login
   - Modificar transaction.controller.ts para userId automático y ownership check
   - Nuevo transaction.upload.controller.ts para subida de archivos
4. **Routes** -
   - Nuevas rutas /auth/*
   - Proteger rutas existentes con middleware
   - Nueva ruta /transactions/upload
5. **Middleware** - Nuevo auth.middleware.ts para verificación de JWT
6. **Schemas** - Zod schemas para validación de datos de auth y upload
7. **Lib** - Posibles helpers para manejo de archivos y JWT
8. **Schemas** - Actualizar TransactionSchema para nuevos campos

## Flujo de Datos
1. **Registro de Usuario**
   - Request → /auth/register → Validator (Zod) → Auth Controller 
   - → Bcrypt hash password → Repository create User → Generate JWT → Response

2. **Login**
   - Request → /auth/login → Validator (Zod) → Auth Controller
   - → Repository find User by email → Bcrypt compare → Generate JWT → Response

3. **Rutas Protegidas**
   - Request → Auth Middleware (verify JWT) → Extract userId from token → 
   - → Controller → Repository (with userId filter where applicable) → Response

4. **Creación de Transacción**
   - Request → /transactions → Auth Middleware → Validator (Zod) → 
   - → Controller (add userId from token) → Repository create → Response

5. **Ownership Check**
   - Request → /transactions/:id → Auth Middleware → 
   - → Controller (verify transaction.userId == token.userId) → 
   - → Repository operation → Response (403 if mismatch)

6. **Subida de Comprobante**
   - Request → /transactions/upload → Auth Middleware → 
   - → Validator (file type/size) → Upload Controller → 
   - → Store file (local/R2) → Generate URL → Response with URL

## Orden Sugerido de Implementación
1. **Actualizar Prisma Schema**
   - Agregar modelo User
   - Extender Transaction con nuevos campos
   - Generar migración

2. **Implementar Autenticación Básica**
   - Crear middleware de verificación de JWT
   - Implementar register y login controllers
   - Crear rutas /auth/register y /auth/login
   - Proteger rutas existentes con middleware

3. **Implementar Transacciones por Usuario**
   - Modificar transaction controller para obtener userId del token
   - Actualizar repository methods para filtrar por userId donde corresponde
   - Implementar ownership check en controller para update/delete

4. **Implementar Subida de Comprobante**
   - Crear upload controller con validaciones de archivo
   - Implementar lógica de almacenamiento (local por defecto)
   - Crear ruta /transactions/upload

5. **Actualizar Balance**
   - Modificar getBalance controller para filtrar por userId

6. **Actualizar Documentación**
   - Actualizar README con nuevas variables de entorno
   - Documentar flujo de autenticación y subida de archivos

## Estrategia de Validación
1. **Pruebas Unitarias de Concepto**
   - Verificar que passwords se hashean correctamente
   - Verificar que JWT se genera y verifica
   - Verificar que middleware protege rutas correctamente

2. **Pruebas de Integración**
   - Flujo completo: register → login → token → crear transacción → obtener transacciones
   - Verificar que transactions están filtradas por usuario
   - Verificar que ownership check devuelve 403 para transacciones ajenas
   - Verificar que balance considera solo transacciones del usuario
   - Probar subida de archivo y uso de URL en transacción

3. **Casos de Edge**
   - Token expirado o inválido → 401
   - Intentar acceder a transacción de otro usuario → 403
   - Archivo no válido (tipo/tamaño) → 400
   - Email duplicado en registro → 409
   - Credenciales inválidas en login → 401

## Ejemplos Conceptuales (Snippets Educativos)

### 1. Modelo User en Prisma Schema
```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  passwordHash String
  createdAt DateTime @default(now())
  transactions Transaction[]
}
```

### 2. Transaction Extendido
```prisma
model Transaction {
  id          Int             @id @default(autoincrement())
  amount      Int
  type        TransactionType
  description String?
  date        DateTime
  receiptUrl  String?         // Nuevo
  latitude    Float?          // Nuevo
  longitude   Float?          // Nuevo
  categoryId  Int
  userId      Int             // Nuevo FK
  category    Category        @relation(fields: [categoryId], references: [id])
  user        User            @relation(fields: [userId], references: [id])
}
```

### 3. Middleware de Autenticación (Concepto)
```typescript
// Pseudocódigo para auth middleware
async function authMiddleware(c: Context, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401)
  }
  
  const token = authHeader.split(' ')[1]
  try {
    const payload = verify(token, JWT_SECRET)
    // Adjuntar userId al context para uso en controllers
    c.set('userId', payload.userId)
    await next()
  } catch (error) {
    return c.json({ error: 'Token inválido' }, 401)
  }
}
```

### 4. Ownership Check en Controller (Concepto)
```typescript
// En transaction controller para update/delete
export const updateTransaction = async (c: Context) => {
  const userId = c.get('userId') // Desde middleware
  const transactionId = Number(c.req.param('id'))
  
  // Primero verificar que la transacción pertenece al usuario
  const transaction = await transactionsRepository.findById(transactionId)
  if (!transaction) {
    return c.json({ error: 'Transacción no encontrada' }, 404)
  }
  
  if (transaction.userId !== userId) {
    return c.json({ error: 'No autorizado' }, 403)
  }
  
  // Luego proceder con la actualización normal
  // ...
}
```

### 5. Registro con Hash de Contraseña (Concepto)
```typescript
// En auth controller para register
export const register = async (c: Context) => {
  // Validar datos con Zod
  const result = registerSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400)
  }
  
  const { email, password } = result.data
  
  // Verificar si el email ya existe
  const existingUser = await usersRepository.findByEmail(email)
  if (existingUser) {
    return c.json({ error: 'Email ya registrado' }, 409)
  }
  
  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, 10)
  
  // Crear usuario
  const user = await usersRepository.create({
    email,
    passwordHash
  })
  
  // Generar JWT
  const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  
  return c.json({ token }, 201)
}
```

### 6. Subida de Archivo (Concepto)
```typescript
// En upload controller
export const uploadReceipt = async (c: Context) => {
  // Verificar que es multipart/form-data
  const form = await c.req.parseBody()
  const file = file.receipt as File | undefined
  
  if (!file) {
    return c.json({ error: 'Archivo requerido' }, 400)
  }
  
  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Tipo de archivo no permitido' }, 400)
  }
  
  // Validar tamaño (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Archivo demasiado grande (máximo 5MB)' }, 400)
  }
  
  // Generar nombre único y guardar archivo
  const fileName = `${uuid()}${getExtension(file.type)}`
  const filePath = path.join(UPLOAD_DIR, fileName)
  
  // Guardar archivo (implementación depende de storage elegido)
  await saveFile(file, filePath)
  
  // Generar URL pública
  const receiptUrl = `${BASE_URL}/uploads/${fileName}`
  
  return c.json({ receiptUrl }, 200)
}
```

## Errores Comunes a Evitar
1. **Olvidar hashear contraseñas** - Descuento automático de -10 pts
2. **Duplicar middleware de auth en cada ruta** - -15 pts
3. **Colocar ownership check en repository** - Viola separación de capas
4. **Permitir que userId venga del body** - Debe venir exclusivamente del token
5. **No validar tipo/tamaño de archivo en upload** - Vulnerabilidad de seguridad
6. **Olvidar proteger rutas existentes** - Solo /auth/* deben estar sin protección
7. **No filtrar transacciones por userId en repository methods** - Fuga de datos
8. **Usar Prisma directamente en controllers** - Debe ir a través de repositories
9. **No manejar errores de archivo correctamente** - Debe devolver 400 con mensaje claro
10. **No actualizar README con nuevas variables de entorno** - -5 pts

## Próximos Pasos para el Estudiante
1. **Analizar el esquema actual** en `prisma/schema.prisma`
2. **Planear los cambios al esquema** para agregar User y extender Transaction
3. **Crear el middleware de autenticación** antes de modificar cualquier controlador existente
4. **Implementar register/login** y probar con Bruno/Postman
5. **Proteger rutas existentes** y verificar que requieren token
6. **Modificar los controllers de transacciones** para incluir userId y ownership check
7. **Implementar la ruta de subida de archivos**
8. **Actualizar el método de balance** para filtrar por usuario
9. **Actualizar documentación** en README.md
10. **Crear commits descriptivos** para cada funcionalidad implementada

## Sugerencia de Commits Descriptivos
Para cumplir con el requisito de "historial de commits descriptivo", considere hacer commits como estos:

1. `feat: add User model and extend Transaction schema`
   - Agregar modelo User y campos receiptUrl, latitude, longitude, userId a Transaction
   - Generar migración inicial

2. `feat: implement JWT authentication middleware`
   - Crear src/middleware/auth.middleware.ts
   - Implementar verificación de token y extracción de userId

3. `feat: implement auth controllers and routes`
   - Crear src/controllers/auth.controller.ts con register y login
   - Crear src/routes/auth.routes.ts
   - Agregar rutas POST /auth/register y POST /auth/login

4. `feat: protect existing routes with authentication middleware`
   - Aplicar middleware a todas las rutas existentes excepto /auth/*
   - Modificar src/routes/categories.routes.ts y src/routes/transactions.routes.ts

5. `feat: add userId to transaction creation and update`
   - Modificar transaction controller para extraer userId del token
   - Actualizar creación de transacción para incluir userId automáticamente
   - Actualizar update controller para pasar userId al repository cuando corresponda

6. `feat: implement ownership check for transactions`
   - Agregar verificación de ownership (transaction.userId === token.userId) en controllers
   - Devolver 403 cuando no hay autorización
   - Aplicar a GET/:id, PATCH/:id, DELETE/:id de transacciones

7. `feat: implement file upload for receipts`
   - Crear src/controllers/transaction.upload.controller.ts
   - Agregar validaciones de tipo (JPEG/PNG/WebP) y tamaño (5MB)
   - Implementar almacenamiento local en uploads/
   - Crear ruta POST /transactions/upload

8. `feat: update transaction repository for user filtering`
   - Modificar findAll y findById en transactions.repository.ts para filtrar por userId cuando se proporciona
   - Mantener métodos genéricos para uso interno cuando se necesita ownership check previo

9. `feat: update balance calculation to user-specific`
   - Modificar getBalance controller para filtrar transacciones por userId del token
   - Asegurar que totalIncome, totalExpense y balance solo incluyan transacciones del usuario

10. `docs: update README with authentication and upload instructions`
    - Documentar nuevas variables de entorno (JWT_SECRET, etc.)
    - Explicar flujo de autenticación: registro → login → uso de token
    - Detallar endpoint de subida de comprobante y su uso
    - Instrucciones para probar con Bruno/Postman

11. `fix: ensure proper error handling for auth and upload`
    - Agregar manejo adecuado de errores en todos los nuevos controllers
    - Devolver status codes apropiados (400, 401, 403, 409)
    - Mensajes de error claros para el frontend

Este enfoque de commits sigue el principio de "un commit por funcionalidad significativa" y permite demostrar una progresión clara del trabajo en el repositorio.