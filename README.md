# API de Finanzas — Cashi

API REST construida con arquitectura N-Layer para gestionar transacciones financieras personales.

**Stack:** Node.js · TypeScript · Hono · Prisma 7 · Zod · PostgreSQL · Docker

**URL de producción:** https://cashi-app.onrender.com

---

## Requisitos previos

- Node.js 22.x
- Docker Desktop corriendo
- Corepack habilitado (`corepack enable`)

---

## Instalación y puesta en marcha

### 1. Instalar dependencias

```bash
yarn install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y ajusta los valores si es necesario:

```bash
cp .env.example .env
```

El `.env` por defecto apunta a la base de datos que levanta Docker:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cashi_db"
```

### 3. Levantar la base de datos

```bash
docker compose up -d
```

Esto levanta un contenedor PostgreSQL 16 con los datos persistidos en un volumen Docker. Para verificar que está corriendo:

```bash
docker compose ps
```

### 4. Generar el cliente de Prisma

```bash
yarn prisma:generate
```

Esto genera el cliente TypeScript en `src/generated/prisma/` a partir del schema.

### 5. Correr las migraciones y seeder

```bash
yarn prisma:migrate
```

Crea las tablas en la base de datos. La primera vez pedirá un nombre para la migración, puedes nombrarlo como `init`.

Si se está haciendo un pull de los cambios recientes y se desea borrar la Base de Datos, ejecutar el siguiente comando:

```bash
yarn prisma migrate reset
```

Luego, para poblar la base con los datos de prueba

```bash
yarn prisma db seed
```

### 6. Iniciar el servidor

```bash
yarn dev
```

El servidor queda disponible en `http://localhost:3000`.

---

## Scripts disponibles

| Script                 | Descripción                                   |
| ---------------------- | --------------------------------------------- |
| `yarn dev`             | Servidor en modo desarrollo con hot reload    |
| `yarn build`           | Compila el proyecto con tsdown                |
| `yarn start`           | Corre el build compilado                      |
| `yarn prisma:generate` | Regenera el cliente Prisma desde el schema    |
| `yarn prisma:migrate`  | Crea y aplica migraciones                     |
| `yarn prisma:studio`   | Abre Prisma Studio (interfaz visual de la BD) |

---

## Flujo de trabajo diario

```bash
docker compose up -d       # 1. Levantar la BD
yarn dev                   # 2. Iniciar el servidor
# ... trabajar ...
docker compose stop        # 3. Apagar la BD al terminar
```

Solo correr `yarn prisma:migrate` cuando hay cambios en `prisma/schema.prisma`.

---

## Arquitectura N-Layer

El código está organizado en capas. Cada capa tiene una única responsabilidad y solo se comunica con la capa inmediatamente debajo.

```
Request → Routes → Controller → Repository → Base de datos
```

### `src/schemas/`

Define la forma que deben tener los datos de entrada usando Zod. Es la única fuente de verdad para validación en runtime y tipos en compile time. No ejecuta lógica, solo declara contratos.

```
src/schemas/
├── categories.schema.ts
├── transactions.schema.ts
└── auth.schema.ts
```

Los tipos (`CreateCategoryInput`, `UpdateCategoryInput`, `RegisterInput`, `LoginInput`, etc.) se infieren directamente del schema con `z.infer`, por lo que nunca están desincronizados con las reglas de validación.

### `src/repositories/`

Única capa que habla con la base de datos. Cada repositorio define primero una interfaz TypeScript que actúa como contrato, y luego un objeto literal que implementa ese contrato usando Prisma.

```
src/repositories/
├── categories.repository.ts        ← interfaz CategoryRepository + implementación Prisma
├── transactions.repository.ts      ← interfaz TransactionRepository + implementación Prisma
└── users.repository.ts             ← interfaz UserRepository + implementación Prisma
```

Los métodos del repository devuelven tipos extendidos (por ejemplo, `TransactionWithCategory`) que incluyen las relaciones cargadas con `include`, ya que los tipos base de Prisma no las incluyen por defecto.

### `src/controllers/`

Coordina el flujo de cada endpoint: extrae datos del request, valida con Zod usando `safeParse`, llama al repository y devuelve la respuesta. No accede a Prisma directamente ni contiene lógica de negocio compleja.

```
src/controllers/
├── categories.controller.ts
├── transactions.controller.ts
├── auth.controller.ts
└── upload.controller.ts
```

Los errores de Prisma se capturan con `try/catch` y se delegan a `parsePrismaError` para convertirlos en respuestas HTTP con el status correcto.

### `src/middlewares/`

Funciones de middleware reutilizables que se aplican a las rutas.

```
src/middlewares/
└── auth.middleware.ts        ← verifica JWT y extrae userId
```

### `src/routes/`

Solo mapea URLs a funciones de controller. No contiene lógica, validaciones ni acceso a datos.

```
src/routes/
├── categories.routes.ts        ← GET /categories, POST /categories, etc.
├── transactions.routes.ts      ← GET /transactions, POST /transactions, POST /transactions/upload, etc.
└── auth.routes.ts              ← POST /auth/register, POST /auth/login
```

### `src/lib/`

Utilidades compartidas que no pertenecen a ninguna capa específica.

```
src/lib/
├── prisma.ts          ← singleton de PrismaClient con driver adapter
├── prisma-error.ts    ← helper para convertir errores de Prisma en respuestas HTTP
├── upload.ts          ← servicio para subir archivos (estrategia dual: local o R2)
└── r2.ts              ← configuración del cliente AWS S3 para Cloudflare R2
```

`prisma.ts` exporta una única instancia de `PrismaClient` usada por todos los repositories. Crear múltiples instancias agota el pool de conexiones.

`prisma-error.ts` centraliza el mapeo de códigos de error de Prisma a status HTTP:

| Código Prisma | Status HTTP              | Causa                          |
| ------------- | ------------------------ | ------------------------------ |
| `P2002`       | 409 Conflict             | Valor duplicado en campo único |
| `P2003`       | 422 Unprocessable Entity | Foreign key que no existe      |
| `P2025`       | 404 Not Found            | Registro no encontrado         |

### `src/generated/`

Código generado automáticamente por Prisma. No editar manualmente. Se regenera con `yarn prisma:generate`.

### `src/index.ts`

Entry point de la aplicación. Carga las variables de entorno, crea la instancia de Hono, monta los routers y arranca el servidor.

---

## Autenticación

La API usa JWT Bearer Token con refresh tokens para sesiones persistentes en mobile.

### Tokens

- **Access Token**: Expira en 15 minutos. Se usa en el header `Authorization: Bearer <token>`
- **Refresh Token**: Expira en 30 días. Se usa para obtener nuevos access tokens

### Flujo

1. Login/Register → Devuelve `accessToken` y `refreshToken`
2. Usar `accessToken` en header Authorization para rutas protegidas
3. Cuando expire (401), enviar `refreshToken` a `POST /auth/refresh`
4. Recibir nuevos tokens
5. Logout → Enviar `refreshToken` a `POST /auth/logout`

### Ejemplo de respuesta

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

---

## Upload de comprobantes

La API soporta upload de imágenes para comprobantes.

Formatos permitidos:

- image/jpeg
- image/png
- image/webp

Tamaño máximo:

- 5 MB

Estrategias de almacenamiento:

- Local (`/uploads`)
- Cloudflare R2 (si las variables están configuradas)

---

## Endpoints

### Autenticación

| Método | Ruta              | Auth | Descripción                                    |
| ------ | ----------------- | ---- | ---------------------------------------------- |
| POST   | `/auth/register`  | ❌   | Crear cuenta, devuelve access y refresh token  |
| POST   | `/auth/login`     | ❌   | Login, devuelve access y refresh token         |
| POST   | `/auth/refresh`   | ❌   | Renueva access token usando refresh token      |
| POST   | `/auth/logout`    | ✅   | Invalida el refresh token (logout)             |

### Transactions

| Método | Ruta                    | Auth | Descripción                                |
| ------ | ----------------------- | ---- | ------------------------------------------ |
| GET    | `/transactions`         | ✅   | Lista todas las transacciones del usuario  |
| GET    | `/transactions/balance` | ✅   | Obtiene el balance del usuario autenticado |
| GET    | `/transactions/:id`     | ✅   | Detalle de una transacción                 |
| POST   | `/transactions`         | ✅   | Crea una transacción                       |
| PATCH  | `/transactions/:id`     | ✅   | Actualiza una transacción                  |
| DELETE | `/transactions/:id`     | ✅   | Elimina una transacción                    |
| POST   | `/transactions/upload`  | ✅   | Sube comprobante, devuelve URL             |

### Categorías

| Método | Ruta              | Auth | Descripción                                      |
| ------ | ----------------- | ---- | ------------------------------------------------ |
| GET    | `/categories`     | ✅   | Lista todas las categorías                       |
| GET    | `/categories/:id` | ✅   | Detalle de una categoría (con sus transacciones) |
| POST   | `/categories`     | ✅   | Crea una categoría                               |
| PATCH  | `/categories/:id` | ✅   | Actualiza una categoría                          |
| DELETE | `/categories/:id` | ✅   | Elimina una categoría                            |

---

## Estructura del proyecto

```
├── bruno/                  ← colección Bruno para probar la API
├── prisma/
│   └── schema.prisma       ← modelos: Transaction, Category
├── prisma.config.ts        ← configuración de Prisma 7 (datasource, migraciones)
├── src/
│   ├── index.ts
│   ├── schemas/
│   ├── repositories/
│   ├── controllers/
│   ├── routes/
│   ├── lib/
│   └── generated/          ← cliente Prisma generado (no editar)
├── docker-compose.yml
├── .env                    ← no se sube al repo
├── .env.example
└── tsconfig.json
```

---

## Uso de IA

Se utilizó IA como herramienta de apoyo para:

- detección de errores
- aclaración de documentación técnica
- planificación de implementación
- generación de validaciones iniciales

Toda la integración y validación final fue realizada manualmente.

---

## Probar la API

La carpeta `bruno/` contiene una colección lista para usar con [Bruno](https://www.usebruno.com/), un cliente API open source. Abre Bruno, importa la carpeta y selecciona el entorno `Development`.

### Flujo de autenticación

1. **Register** o **Login** → guardan `accessToken` y `refreshToken` automáticamente
2. **Refresh Token** → renueva ambos tokens usando el `refreshToken`
3. **Logout** → invalida el `refreshToken`

### Orden recomendado para probar

1. `POST /auth/register` → guardar tokens automáticamente
2. `POST /auth/login` → guardar tokens automáticamente
   - Se puede hacer inicio de sesión con los usuarios del seeder:
     - Usuario 1
       - email: carlos@example.com
       - password: password123
     - Usuario 2
       - email: ana@example.com
       - password: password123
3. `POST /auth/refresh` → renovar tokens
4. `POST /auth/logout` → invalidar refresh token
5. `GET /categories` con token → debe funcionar
6. `GET /categories` sin token → debe devolver `401`
7. `POST /transactions/upload` con imagen > 5MB → debe devolver `422`
8. `POST /transactions/upload` con imagen válida → debe devolver `{ receiptUrl }`
9. `POST /transactions` con token → crear transacción (con `receiptUrl` en el body)
10. `POST /transactions` con token → crear transacción (sin `receiptUrl` en el body)
11. `GET /transactions` con token de usuario A → no debe ver transacciones de usuario B
12. `DELETE /transactions/:id` con token de usuario B sobre transacción de usuario A → debe devolver `403`
13. `DELETE /transactions/:id` con id inexistente → debe devolver `404`
14. `GET /transactions/balance` → debe reflejar solo las transacciones del usuario autenticado

### Requests de Bruno disponibles

| Request | Endpoint | Auth | Descripción |
|---------|----------|------|-------------|
| Register | `POST /auth/register` | ❌ | Crear cuenta |
| Login | `POST /auth/login` | ❌ | Iniciar sesión |
| Refresh Token | `POST /auth/refresh` | ❌ | Renovar tokens |
| Logout | `POST /auth/logout` | ✅ | Cerrar sesión |
| Get Categories | `GET /categories` | ✅ | Listar categorías |
| Create Category | `POST /categories` | ✅ | Crear categoría |
| Get Transactions | `GET /transactions` | ✅ | Listar transacciones |
| Create Transaction | `POST /transactions` | ✅ | Crear transacción |
| Upload | `POST /transactions/upload` | ✅ | Subir comprobante |
| Balance | `GET /transactions/balance` | ✅ | Ver balance |

---

## Errores comunes

**`Can't reach database server`** — La BD no está corriendo. Ejecuta `docker compose up -d`.

**`The table does not exist`** — Falta correr las migraciones. Ejecuta `yarn prisma:migrate`.

**`Environment variable not found: DATABASE_URL`** — Falta el archivo `.env`. Copia `.env.example`.

**`client password must be a string`** — `DATABASE_URL` no se está cargando. Verifica que `import 'dotenv/config'` sea la primera línea de `src/index.ts`.

**`@prisma/client did not initialize yet`** — Falta generar el cliente. Ejecuta `yarn prisma:generate`.
