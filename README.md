# API de Notas — Unidad 2

API REST construida con arquitectura N-Layer. Permite gestionar notas organizadas por categorías y etiquetadas con tags.

**Stack:** Node.js · TypeScript · Hono · Prisma 7 · Zod · PostgreSQL · Docker

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notesdb"
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

### 5. Correr las migraciones

```bash
yarn prisma:migrate
```

Crea las tablas en la base de datos. La primera vez pedirá un nombre para la migración, puedes escribir `init`.

### 6. Iniciar el servidor

```bash
yarn dev
```

El servidor queda disponible en `http://localhost:3000`.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `yarn dev` | Servidor en modo desarrollo con hot reload |
| `yarn build` | Compila el proyecto con tsdown |
| `yarn start` | Corre el build compilado |
| `yarn prisma:generate` | Regenera el cliente Prisma desde el schema |
| `yarn prisma:migrate` | Crea y aplica migraciones |
| `yarn prisma:studio` | Abre Prisma Studio (interfaz visual de la BD) |

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
└── notes.schema.ts    ← schemas de validación + tipos inferidos para los tres recursos
```

Los tipos (`CreateNoteInput`, `UpdateNoteInput`, etc.) se infieren directamente del schema con `z.infer`, por lo que nunca están desincronizados con las reglas de validación.

### `src/repositories/`

Única capa que habla con la base de datos. Cada repositorio define primero una interfaz TypeScript que actúa como contrato, y luego un objeto literal que implementa ese contrato usando Prisma. Si en el futuro se cambia de ORM o de base de datos, solo cambia este archivo — el resto del sistema no se entera.

```
src/repositories/
├── notes.repository.ts        ← interfaz NoteRepository + implementación Prisma
├── categories.repository.ts   ← interfaz CategoryRepository + implementación Prisma
└── tags.repository.ts         ← interfaz TagRepository + implementación Prisma
```

Los métodos del repository devuelven tipos extendidos (`NoteWithRelations`) que incluyen las relaciones cargadas con `include`, ya que los tipos base de Prisma no las incluyen por defecto.

### `src/controllers/`

Coordina el flujo de cada endpoint: extrae datos del request, valida con Zod usando `safeParse`, llama al repository y devuelve la respuesta. No accede a Prisma directamente ni contiene lógica de negocio compleja.

```
src/controllers/
├── notes.controller.ts
├── categories.controller.ts
└── tags.controller.ts
```

Los errores de Prisma se capturan con `try/catch` y se delegan a `parsePrismaError` para convertirlos en respuestas HTTP con el status correcto.

### `src/routes/`

Solo mapea URLs a funciones de controller. No contiene lógica, validaciones ni acceso a datos.

```
src/routes/
├── notes.routes.ts        ← GET /notes, POST /notes, PATCH /notes/:id, etc.
├── categories.routes.ts   ← GET /categories, POST /categories, etc.
└── tags.routes.ts         ← GET /tags, POST /tags, etc.
```

### `src/lib/`

Utilidades compartidas que no pertenecen a ninguna capa específica.

```
src/lib/
├── prisma.ts          ← singleton de PrismaClient con driver adapter
└── prisma-error.ts    ← helper para convertir errores de Prisma en respuestas HTTP
```

`prisma.ts` exporta una única instancia de `PrismaClient` usada por todos los repositories. Crear múltiples instancias agota el pool de conexiones.

`prisma-error.ts` centraliza el mapeo de códigos de error de Prisma a status HTTP:

| Código Prisma | Status HTTP | Causa |
|---|---|---|
| `P2002` | 409 Conflict | Valor duplicado en campo único |
| `P2003` | 422 Unprocessable Entity | Foreign key que no existe |
| `P2025` | 404 Not Found | Registro no encontrado |

### `src/generated/`

Código generado automáticamente por Prisma. No editar manualmente. Se regenera con `yarn prisma:generate`.

### `src/index.ts`

Entry point de la aplicación. Carga las variables de entorno, crea la instancia de Hono, monta los routers y arranca el servidor.

---

## Endpoints

### Notas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/notes` | Lista todas las notas con categoría y tags |
| GET | `/notes/:id` | Detalle de una nota |
| POST | `/notes` | Crea una nota |
| PATCH | `/notes/:id` | Actualiza título y/o contenido |
| DELETE | `/notes/:id` | Elimina una nota |
| POST | `/notes/:id/tags` | Asocia un tag existente a una nota |
| DELETE | `/notes/:id/tags/:tagId` | Desasocia un tag de una nota |

### Categorías

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/categories` | Lista todas las categorías |
| GET | `/categories/:id` | Detalle de una categoría |
| POST | `/categories` | Crea una categoría |
| DELETE | `/categories/:id` | Elimina una categoría |

### Tags

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/tags` | Lista todos los tags |
| GET | `/tags/:id` | Detalle de un tag |
| POST | `/tags` | Crea un tag |
| DELETE | `/tags/:id` | Elimina un tag |

---

## Estructura del proyecto

```
├── bruno/                  ← colección Bruno para probar la API
├── prisma/
│   └── schema.prisma       ← modelos: Note, Category, Tag, NoteTag
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

## Probar la API

La carpeta `bruno/` contiene una colección lista para usar con [Bruno](https://www.usebruno.com/), un cliente API open source. Abre Bruno, importa la carpeta y selecciona el entorno `Development`.

El orden recomendado para probar por primera vez:

1. Crear una categoría (`POST /categories`)
2. Crear un tag (`POST /tags`)
3. Crear una nota con el `categoryId` obtenido en el paso 1
4. Asociar el tag a la nota

---

## Errores comunes

**`Can't reach database server`** — La BD no está corriendo. Ejecuta `docker compose up -d`.

**`The table does not exist`** — Falta correr las migraciones. Ejecuta `yarn prisma:migrate`.

**`Environment variable not found: DATABASE_URL`** — Falta el archivo `.env`. Copia `.env.example`.

**`client password must be a string`** — `DATABASE_URL` no se está cargando. Verifica que `import 'dotenv/config'` sea la primera línea de `src/index.ts`.

**`@prisma/client did not initialize yet`** — Falta generar el cliente. Ejecuta `yarn prisma:generate`.
