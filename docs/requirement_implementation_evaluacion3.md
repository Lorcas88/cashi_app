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
   - Middleware de autenticación para proteger rutas (excepto /auth/\*)
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
   - Nuevas rutas /auth/\*
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

## Plan de Implementación — Cashi Unidad 3

---

### 1. Actualizar Prisma Schema

- Agregar modelo `User` con campos: `id`, `email` (único), `passwordHash`, `createdAt`
- Extender `Transaction` con: `receiptUrl` (String?), `latitude` (Float?), `longitude` (Float?), `userId` (Int, relación con User)
- Definir la relación `User → Transaction` (one-to-many) en ambos modelos
- Asegurarse de que `categoryId` sigue siendo obligatorio y apunta a `Category`
- Correr `yarn prisma migrate dev --name add-user-and-receipt-fields`
- Actualizar `prisma/schema.prisma` y verificar que `docker-compose up` levanta sin errores

> ⚠️ Si ya tienen datos de la Unidad 2, correr `yarn prisma migrate reset` antes de la migración.

```
git commit -m "feat(prisma): add User model and extend Transaction with userId, receiptUrl, lat/lng"
```

---

### 2. Instalar Dependencias Nuevas

- Instalar `bcryptjs`, `@types/bcryptjs`, `jsonwebtoken`, `@types/jsonwebtoken`
- Instalar `@aws-sdk/client-s3` (para el upload) (opcional)
- Verificar que `package.json` queda actualizado

```
git commit -m "chore(deps): add bcryptjs, jsonwebtoken, multer and uuid"
```

---

### 3. Configurar Variables de Entorno

- Agregar al `.env`: `JWT_SECRET`, `JWT_EXPIRES_IN` (ej. `7d`), `UPLOAD_DIR` (ej. `uploads/`)
- Si usan R2: agregar `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- Actualizar `.env.example` con todas las variables nuevas (sin valores reales)

```
git commit -m "chore(env): add JWT and upload env variables"
```

---

### 3.5 Crear Schemas de Validación para Auth

- Crear src/schemas/auth.schema.ts:
  - registerSchema: validar email (formato email válido) y password (mínimo 8 caracteres)
  - loginSchema: mismos campos, mismas validaciones
- Usar los schemas en el controller de auth para validar el body antes de procesar — si falla, devolver 400 con el mensaje de error de Zod

```
git commit -m "feat(schemas): add Zod validation schemas for register and login"
```

---

### 4. Implementar Autenticación — Repository y Controller

- Crear `src/repositories/user.repository.ts`:
  - `findByEmail(email)` — buscar usuario por email
  - `createUser(email, passwordHash)` — crear usuario
- Crear `src/controllers/auth.controller.ts`:
  - `register`: validar que email no exista → hashear contraseña con bcrypt (mínimo 10 rounds) → crear usuario → firmar JWT → devolver `{ token }`
  - `login`: buscar usuario por email → comparar contraseña con `bcrypt.compare` → firmar JWT → devolver `{ token }`
  - Ambos deben devolver `400` si faltan campos, `409` en register si el email ya existe, `401` en login si credenciales inválidas
- El JWT debe incluir en el payload: `{ userId, email }`

```
git commit -m "feat(auth): add user repository and register/login controllers with bcrypt and JWT"
```

---

### 5. Crear Middleware de Autenticación

- Crear `src/middlewares/auth.middleware.ts` como función separada (no inline)
- Verificar header `Authorization: Bearer {token}` → extraer token → verificar con `jwt.verify` usando `JWT_SECRET`
- Si el token es válido: adjuntar el payload al objeto `req` (ej. `req.user = { userId, email }`)
- Si falta el header o el token es inválido/expirado: responder `401 Unauthorized`

> ⚠️ Este middleware debe ser **una sola función** importada en las rutas. El descuento de −15 pts aplica si se duplica en cada ruta.

```
git commit -m "feat(middleware): add centralized JWT auth middleware with Express type extension"
```

---

### 6. Crear Rutas de Autenticación

- Crear `src/routes/auth.routes.ts` con `POST /auth/register` y `POST /auth/login` (sin middleware)
- Registrar el router en `src/app.ts` bajo el prefijo `/auth`
- Probar en Bruno: register → login → verificar que se recibe token

```
git commit -m "feat(routes): add /auth/register and /auth/login routes"
```

---

### 7. Proteger Rutas Existentes con Middleware

- En `src/routes/categories.routes.ts`: aplicar `authMiddleware` a todas las rutas
- En `src/routes/transactions.routes.ts`: aplicar `authMiddleware` a todas las rutas
- Verificar que un request sin token a `/categories` devuelve `401`
- Verificar que un request con token válido sigue funcionando igual que en la Unidad 2

```
git commit -m "feat(routes): protect all category and transaction routes with auth middleware"
```

---

### 8. Transacciones por Usuario — Repository

- Actualizar `src/repositories/transaction.repository.ts`:
  - `getAll(userId)`: agregar `where: { userId }` al query de Prisma
  - `getById(id)`: no filtrar por `userId` aquí — devolver la transacción completa (el ownership check va en el controller)
  - `create(data, userId)`: incluir `userId` en el objeto de creación
  - `update(id, data)` y `delete(id)`: sin cambios en el repository — el ownership check no va aquí

> ⚠️ El controller NO debe usar Prisma directamente. Hacerlo aplica −10 pts.

```
git commit -m "feat(transactions): update repository to filter by userId in getAll and create"
```

---

### 9. Transacciones por Usuario — Controller y Ownership Check

- Actualizar `src/controllers/transaction.controller.ts`:
  - En todos los métodos: extraer `userId` de `req.user.userId`
  - `getAll`: pasar `userId` al repository
  - `create`: pasar `userId` al repository; ignorar cualquier `userId` que venga en el body
  - `getById`: obtener transacción → si no existe, `404` → si `transaction.userId !== req.user.userId`, responder `403 Forbidden`
  - `update`: misma lógica de ownership → si es dueño, actualizar
  - `delete`: misma lógica de ownership → si es dueño, eliminar

> ⚠️ El ownership check debe estar en el controller, no en el repository. Ambos casos (`404` y `403`) deben funcionar y mostrarse en el video.

```
git commit -m "feat(transactions): add userId extraction from token and ownership check (403/404) in controller"
```

---

### 10. Actualizar Balance

- En `src/controllers/transaction.controller.ts`, método `getBalance`:
  - Pasar `userId` al repository para que el cálculo considere solo las transacciones del usuario autenticado
- Actualizar el método correspondiente en el repository para recibir y aplicar el filtro `where: { userId }`

```
git commit -m "feat(transactions): filter balance calculation by authenticated userId"
```

---

11. Implementar Subida de Comprobante (reemplaza la versión anterior)lib/upload.ts — estrategia dual automática

Crear src/lib/upload.ts con la función uploadFile(file: File): Promise<string>
Implementar isR2Configured() que revisa si todas las variables R2\_\* están presentes
Si R2 está configurado: subir con PutObjectCommand del SDK de AWS bajo el folder receipts/, devolver URL pública ${R2_PUBLIC_URL}/receipts/uuid.ext
Si R2 no está configurado: guardar en uploads/ local con writeFile + mkdir({ recursive: true }), devolver /uploads/uuid.ext
En ambos casos el nombre del archivo se genera con randomUUID() + extensión original
src/controllers/upload.controller.ts

Parsear el body con c.req.parseBody() (no usar multer)
Leer el campo receipt (no image — el enunciado de la evaluación dice campo receipt)
Si no viene archivo o viene como string → 400
Validar file.type contra ['image/jpeg', 'image/png', 'image/webp'] → 422 si no pasa
Validar file.size <= 5 _ 1024 _ 1024 → 422 si supera 5 MB
Llamar uploadFile(file) → devolver { receiptUrl: url }
El controller no sabe si se está usando R2 o local — eso lo decide lib/upload.ts
Ruta y archivos estáticos

Agregar POST /transactions/upload en src/routes/transactions.routes.ts con authMiddleware
En src/index.ts, servir archivos estáticos para desarrollo local:

ts import { serveStatic } from '@hono/node-server/serve-static';
app.use('/uploads/\*', serveStatic({ root: './' }));

Esto solo es necesario para almacenamiento local — en R2 los archivos se sirven desde la URL pública directamente.
Variables de entorno a agregar (ya cubiertas en el paso 3, pero recordar):

Para R2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
Si falta cualquiera de las 5, el sistema cae automáticamente a almacenamiento local
Flujo esperado

1. POST /transactions/upload → { receiptUrl: "/uploads/uuid.jpg" } (local)
   → { receiptUrl: "https://pub-xxx.r2.dev/receipts/uuid.jpg" } (R2)
2. POST /transactions → body incluye receiptUrl con la URL del paso anteriorgit commit -m "feat(upload): add dual-strategy upload lib (R2/local) and upload controller using Hono parseBody"

```
git commit -m "feat(upload): add multer middleware and upload controller for receipt images (local storage)"
```

---

### 12. Crear Seeder para Testing

- Crear `prisma/seed.ts`:
  - Crear 2 usuarios de prueba con contraseñas hasheadas con bcrypt
  - Crear categorías globales (ej. Alimentación, Transporte, Entretenimiento)
  - Crear transacciones para cada usuario (al menos 3 por usuario, mezcla de income/expense)
  - Algunas transacciones con `receiptUrl` y coordenadas GPS de ejemplo
- Registrar el seeder en `package.json` bajo `prisma.seed`
- Correr con `yarn prisma db seed` y verificar en Bruno que los usuarios pueden hacer login

```
git commit -m "chore(seed): add seed script with test users, categories and transactions"
```

---

### 13. Actualizar README

- Instrucciones de instalación paso a paso (clone → install → .env → docker-compose up → migrate → seed)
- Tabla de todas las variables de entorno con descripción y valor de ejemplo
- Documentar si el almacenamiento es local o R2
- Declaración de uso de IA (herramientas usadas y para qué)
- Colección de Bruno exportada (opcional pero recomendado)

```
git commit -m "docs(readme): update with install instructions, env vars, storage docs and AI usage declaration"
```

---

### Orden sugerido de testing en Bruno

1. `POST /auth/register` → guardar token
2. `POST /auth/login` → guardar token
3. `GET /categories` con token → debe funcionar
4. `GET /categories` sin token → debe devolver `401`
5. `POST /transactions` con token → crear transacción (sin `userId` en body)
6. `GET /transactions` con token de usuario A → no debe ver transacciones de usuario B
7. `DELETE /transactions/:id` con token de usuario B sobre transacción de usuario A → debe devolver `403`
8. `DELETE /transactions/:id` con id inexistente → debe devolver `404`
9. `POST /transactions/upload` con imagen válida → debe devolver `{ receiptUrl }`
10. `POST /transactions/upload` con PDF o archivo > 5MB → debe devolver `400`
11. `GET /transactions/balance` → debe reflejar solo las transacciones del usuario autenticado

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
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verify(token, JWT_SECRET);
    // Adjuntar userId al context para uso en controllers
    c.set('userId', payload.userId);
    await next();
  } catch (error) {
    return c.json({ error: 'Token inválido' }, 401);
  }
}
```

### 4. Ownership Check en Controller (Concepto)

```typescript
// En transaction controller para update/delete
export const updateTransaction = async (c: Context) => {
  const userId = c.get('userId'); // Desde middleware
  const transactionId = Number(c.req.param('id'));

  // Primero verificar que la transacción pertenece al usuario
  const transaction = await transactionsRepository.findById(transactionId);
  if (!transaction) {
    return c.json({ error: 'Transacción no encontrada' }, 404);
  }

  if (transaction.userId !== userId) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  // Luego proceder con la actualización normal
  // ...
};
```

### 5. Registro con Hash de Contraseña (Concepto)

```typescript
// En auth controller para register
export const register = async (c: Context) => {
  // Validar datos con Zod
  const result = registerSchema.safeParse(await c.req.json());
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400);
  }

  const { email, password } = result.data;

  // Verificar si el email ya existe
  const existingUser = await usersRepository.findByEmail(email);
  if (existingUser) {
    return c.json({ error: 'Email ya registrado' }, 409);
  }

  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, 10);

  // Crear usuario
  const user = await usersRepository.create({
    email,
    passwordHash,
  });

  // Generar JWT
  const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  return c.json({ token }, 201);
};
```

### 6. Subida de Archivo (Concepto)

```typescript
// En upload controller
export const uploadReceipt = async (c: Context) => {
  // Verificar que es multipart/form-data
  const form = await c.req.parseBody();
  const file = file.receipt as File | undefined;

  if (!file) {
    return c.json({ error: 'Archivo requerido' }, 400);
  }

  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Tipo de archivo no permitido' }, 400);
  }

  // Validar tamaño (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Archivo demasiado grande (máximo 5MB)' }, 400);
  }

  // Generar nombre único y guardar archivo
  const fileName = `${uuid()}${getExtension(file.type)}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Guardar archivo (implementación depende de storage elegido)
  await saveFile(file, filePath);

  // Generar URL pública
  const receiptUrl = `${BASE_URL}/uploads/${fileName}`;

  return c.json({ receiptUrl }, 200);
};
```

## Errores Comunes a Evitar

1. **Olvidar hashear contraseñas** - Descuento automático de -10 pts
2. **Duplicar middleware de auth en cada ruta** - -15 pts
3. **Colocar ownership check en repository** - Viola separación de capas
4. **Permitir que userId venga del body** - Debe venir exclusivamente del token
5. **No validar tipo/tamaño de archivo en upload** - Vulnerabilidad de seguridad
6. **Olvidar proteger rutas existentes** - Solo /auth/\* deben estar sin protección
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
