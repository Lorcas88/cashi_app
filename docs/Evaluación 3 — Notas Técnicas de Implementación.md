# Evaluación 3 — Notas Técnicas de Implementación

---

# Cambios técnicos

## Autenticación JWT

Se implementó autenticación basada en JWT usando middleware global de Hono.

### Cambios realizados

- Registro de usuarios (`POST /auth/register`)
- Login (`POST /auth/login`)
- Firma de tokens JWT
- Middleware de autenticación
- Protección de rutas privadas
- Extracción de `userId` desde el token

### Payload JWT

```json
{
  "userId": 1,
  "email": "user@example.com",
  "exp": 1234567890
}
```

---

## Modelo User

Se agregó el modelo `User` al schema de Prisma.

### Relaciones

- Un usuario puede tener muchas transacciones
- Cada transacción pertenece a un usuario

---

## Ownership de transacciones

Las operaciones sobre transacciones ahora validan ownership.

Un usuario:

- puede ver sus propias transacciones
- no puede acceder a transacciones de otros usuarios
- no puede modificar transacciones ajenas
- no puede eliminar transacciones ajenas

---

## Balance por usuario

El endpoint:

```http
GET /transactions/balance
```

ahora calcula únicamente las transacciones del usuario autenticado.

---

## Upload de comprobantes

Se implementó upload de imágenes para comprobantes de transacciones.

### Características

- Validación MIME type
- Validación de tamaño máximo
- Soporte para:
  - JPEG
  - PNG
  - WEBP

### Estrategias de almacenamiento

#### Local

Archivos guardados en:

```text
/uploads
```

#### Cloudflare R2

Integración opcional usando S3 SDK.

---

## Seeder

Se agregó un seed de Prisma con:

- usuarios de prueba
- categorías iniciales
- transacciones de ejemplo

---

# Decisiones de implementación

## Arquitectura N-Layer

Se mantuvo separación estricta de responsabilidades:

```text
Routes → Controllers → Repositories → Database
```

### Motivos

- mejor mantenibilidad
- menor acoplamiento
- facilidad de testing
- claridad de responsabilidades

---

## Repositories sin lógica HTTP

Los repositories solo manejan acceso a datos.

Toda validación de negocio y ownership se mantiene en controllers.

### Motivo

Evitar mezclar lógica HTTP con persistencia.

---

## Middleware global de autenticación

El middleware JWT se aplica globalmente después de montar rutas públicas.

### Motivo

Evitar repetir middleware por router y simplificar protección de endpoints.

---

## Estrategia dual de uploads

Se implementó soporte dual:

- almacenamiento local
- Cloudflare R2

### Motivo

Permitir desarrollo local sin depender de servicios externos.

---

## Uso de Prisma Client singleton

Se exporta una única instancia compartida de PrismaClient.

### Motivo

Evitar agotamiento del pool de conexiones.

---

# Fixes realizados con ayuda de IA

## Middleware JWT

### Correcciones

- uso correcto de `verify()`
- extracción segura de payload
- manejo correcto de errores `401`

---

## Upload controller

### Correcciones

- nombre correcto del campo `receipt`
- validación de tamaño
- validación MIME type
- respuesta consistente `{ receiptUrl }`

---

## Transactions controller

### Correcciones

- orden correcto de validaciones `404` y `403`
- uso correcto de `userId`
- eliminación de dependencia del body para ownership

---

## Routing

### Correcciones

Se corrigió el orden de rutas dinámicas y estáticas.

Ejemplo:

```text
/balance
```

antes de:

```text
/:id
```

---

# Observaciones

## Cloudflare R2 es opcional

Si las variables de entorno R2 no existen, el sistema usa almacenamiento local automáticamente.

---

## El upload no crea transacciones

El flujo correcto es:

1. subir imagen
2. obtener `receiptUrl`
3. crear o actualizar transacción usando esa URL

---

## Seeder pensado para testing manual

Los datos del seed están orientados a facilitar pruebas desde Bruno.

---

## Bruno automatiza JWT

La colección Bruno guarda automáticamente el token obtenido en login.
