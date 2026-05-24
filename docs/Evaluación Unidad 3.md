# Evaluación Unidad 3 — Cashi: Autenticación y Comprobantes

**Ramo:** Desarrollo de Aplicaciones Web II

**Modalidad:** Grupal — hasta 3 personas (mismo grupo que la Unidad 2)

**Fecha límite:** Domingo 31 de mayo de 2026, 23:59

---

## Contexto del proyecto

En la Unidad 2 construiste el backend de **Cashi** con un CRUD de categorías, transacciones y balance general. La API funciona — pero cualquier persona que conozca la URL puede leer o modificar los datos de cualquier otra persona.

Cashi está creciendo. Ahora necesita usuarios reales: cada persona debe tener su propia cuenta, sus propias transacciones y la posibilidad de adjuntar una foto del comprobante a cada transacción (boleta, transferencia, recibo).

Esta evaluación es la continuación directa de la Unidad 2. Partes del mismo repositorio y extiendes lo que ya construiste.

---

## Cambios en el modelo de datos

Se agrega el modelo `User` y se extiende `Transaction` con un campo nuevo:

### User (nuevo)

| Campo          | Tipo   | Descripción                                   |
| -------------- | ------ | --------------------------------------------- |
| `id`           | número | Identificador único, generado automáticamente |
| `email`        | texto  | Email del usuario, único                      |
| `passwordHash` | texto  | Hash de la contraseña (nunca texto plano)     |
| `createdAt`    | fecha  | Fecha de creación                             |

### Transaction (extendida)

| Campo         | Tipo   | Descripción                                   |
| ------------- | ------ | --------------------------------------------- |
| `id`          | número | Identificador único                           |
| `amount`      | número | Monto, siempre positivo                       |
| `type`        | texto  | `income` o `expense`                          |
| `description` | texto  | Descripción opcional                          |
| `date`        | fecha  | Fecha de la transacción                       |
| `receiptUrl`  | texto  | URL del comprobante adjunto (opcional)        |
| `latitude`    | número | Coordenada de latitud GPS (opcional)          |
| `longitude`   | número | Coordenada de longitud GPS (opcional)         |
| `categoryId`  | número | Referencia a la categoría                     |
| `userId`      | número | Referencia al usuario dueño de la transacción |

Una transacción pertenece a un usuario. Un usuario puede tener muchas transacciones. Las categorías siguen siendo globales — cualquier usuario autenticado puede verlas y usarlas.

---

## Requerimientos funcionales

### Autenticación

- `POST /auth/register` — crear cuenta con email y contraseña. Devuelve un JWT.
- `POST /auth/login` — iniciar sesión. Devuelve un JWT.
- Las contraseñas deben hashearse con **bcrypt** — nunca guardar texto plano.
- Todas las rutas excepto `/auth/register` y `/auth/login` deben estar protegidas: requieren un JWT válido en el header `Authorization: Bearer {token}`.

### Transacciones por usuario

- `GET /transactions` debe retornar **solo las transacciones del usuario autenticado**, no las de todos los usuarios.
- `GET /transactions/balance` debe calcular el balance **solo con las transacciones del usuario autenticado**.
- Al crear una transacción, debe quedar asociada automáticamente al usuario autenticado — el `userId` no se recibe en el body, se toma del token.
- Un usuario **no puede editar ni eliminar** transacciones de otro usuario. Si intenta hacerlo, debe recibir un `403`.

### Subida de comprobante

- `POST /transactions/upload` — recibe una imagen (`multipart/form-data`, campo `receipt`) y devuelve su URL:

```json
{ "receiptUrl": "https://pub-xxx.r2.dev/receipts/uuid.jpg" }
```

- La URL devuelta se usa luego al crear o editar una transacción en el campo `receiptUrl`.
- Validaciones mínimas: solo se aceptan archivos JPEG, PNG o WebP. Tamaño máximo 5 MB.
- El almacenamiento puede ser local (`uploads/`) o en Cloudflare R2. Si usan R2, documentarlo en el README.

---

## Requerimientos técnicos

- El proyecto debe mantener la arquitectura **N-Layer** de la Unidad 2: routes → controller → repository → schemas.
- El middleware de autenticación debe implementarse como una función separada, no inline en cada ruta.
- El **ownership check** (verificar que la transacción pertenece al usuario) debe estar en el controller, no en el repository.
- Stack sugerido: el mismo de la Unidad 2 + `bcryptjs` + `jsonwebtoken` + `@aws-sdk/client-s3` (opcional para R2).
- La base de datos debe seguir levantándose con **Docker Compose**.
- El repositorio debe tener commits descriptivos que muestren la progresión del trabajo.

### Tabla de endpoints esperados

| Método | Ruta                  | Auth | Descripción                                  |
| ------ | --------------------- | ---- | -------------------------------------------- |
| POST   | /auth/register        | ❌   | Crear cuenta, devuelve token                 |
| POST   | /auth/login           | ❌   | Login, devuelve token                        |
| GET    | /categories           | ✅   | Lista categorías (globales)                  |
| POST   | /categories           | ✅   | Crea una categoría                           |
| PATCH  | /categories/:id       | ✅   | Actualiza una categoría                      |
| DELETE | /categories/:id       | ✅   | Elimina una categoría                        |
| GET    | /transactions         | ✅   | Transacciones del usuario autenticado        |
| GET    | /transactions/:id     | ✅   | Detalle de una transacción                   |
| POST   | /transactions         | ✅   | Crea una transacción                         |
| PATCH  | /transactions/:id     | ✅   | Actualiza una transacción (solo si es dueño) |
| DELETE | /transactions/:id     | ✅   | Elimina una transacción (solo si es dueño)   |
| GET    | /transactions/balance | ✅   | Balance del usuario autenticado              |
| POST   | /transactions/upload  | ✅   | Sube comprobante, devuelve URL               |

---

## Entregables

1. **Repositorio en GitHub** — puede ser el mismo de la Unidad 2 con los nuevos commits encima, o un fork. Debe incluir `docker-compose.yml` y `README.md` actualizado.
2. **Video explicativo** — entre 5 y 10 minutos en Loom o YouTube (puede ser no listado) donde muestren:
   - El flujo completo: registro → login → crear transacción con comprobante → consultar balance
   - La estructura del código: dónde vive el middleware, dónde está el ownership check y por qué
3. **Archivo `.txt` enviado por EVA** con:
   - Nombres de los integrantes del grupo
   - URL del repositorio GitHub
   - URL del video
   - Fecha de entrega

---

## Rúbrica de evaluación

**Total: 100 puntos**

| Criterio              | Puntaje | Descripción                                                                                                                                                                                          |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticación         | 35 pts  | Registro y login funcionan. Las contraseñas se hashean con bcrypt. El JWT se genera y verifica correctamente. Las rutas protegidas rechazan requests sin token o con token inválido con `401`.       |
| Datos por usuario     | 30 pts  | `GET /transactions` retorna solo las transacciones del usuario autenticado. El balance considera solo sus transacciones. El ownership check devuelve `403` cuando corresponde.                       |
| Subida de comprobante | 20 pts  | `POST /transactions/upload` recibe la imagen y devuelve una URL válida. El campo `receiptUrl` se puede incluir al crear o editar una transacción. Las validaciones de tipo y tamaño están presentes. |
| Entregables y calidad | 15 pts  | README actualizado con instrucciones de instalación y variables de entorno necesarias. Commits descriptivos. Video muestra el flujo completo y demuestra comprensión del código.                     |

---

## Criterios de descuento

- **−15 pts** si el middleware de autenticación está duplicado en cada ruta en vez de centralizado
- **−10 pts** si el controller usa Prisma directamente sin pasar por el repository
- **−10 pts** si las contraseñas se guardan en texto plano (descuento automático, sin posibilidad de recuperar)
- **−5 pts** si el README no documenta las variables de entorno necesarias para levantar el proyecto
- **−5 pts** si el repositorio tiene un solo commit con todo el código

---

## Uso de IA

Pueden usar IA (ChatGPT, Claude, Copilot, etc.) para ayudarse a desarrollar. Si la usaron, deben declararlo en el `README.md` indicando qué herramientas usaron y para qué.

En el video deben ser capaces de explicar el código que entregan: qué hace el middleware, por qué el ownership check está en el controller y no en el repository, cómo fluye el token desde el login hasta una request protegida. Si el video no refleja comprensión del código, se evaluará como si no fuera de su autoría.

---

## Consejos antes de empezar

- Empiecen por agregar el modelo `User` al schema de Prisma y correr la migración. Si ya tienen datos en la BD de desarrollo, usen `yarn prisma migrate reset` para empezar limpio.
- Implementen el registro y login antes de tocar cualquier otra ruta. Sin token no pueden probar nada.
- Configuren el middleware y protegen todas las rutas antes de implementar el ownership check — así pueden verificar que la autenticación básica funciona.
- Prueben el flujo completo en Bruno: register → login → copiar el token → usarlo en las rutas protegidas.
- La subida de comprobante es independiente del CRUD de transacciones — pueden implementarla en cualquier orden.

---

## Preguntas frecuentes

**¿Tengo que migrar las transacciones existentes de la Unidad 2?**

No necesariamente. En desarrollo pueden hacer `yarn prisma migrate reset` y empezar con la BD vacía. Lo que importa es que el código funcione correctamente, no que conserven datos de prueba.

**¿El `userId` se recibe en el body al crear una transacción?**

No. El `userId` se extrae del token JWT en el controller. El cliente no lo envía — si lo enviara, lo ignoran.

**¿Las categorías también son por usuario?**

No. Las categorías son globales: cualquier usuario autenticado puede verlas y usarlas. Solo las transacciones son privadas por usuario.

**¿Dónde guardo las imágenes si no tengo cuenta de Cloudflare R2?**

Pueden guardarlas localmente en una carpeta `uploads/`. Documenten en el README que las imágenes son locales y que en producción se migrarían a un object storage. No se descuenta por usar almacenamiento local siempre que esté documentado.

**¿Qué pasa si intento eliminar una transacción que no es mía?**

Debe retornar `403 Forbidden`. Si la transacción no existe, retorna `404`. En el video deben demostrar ambos casos.

**¿Puedo usar un framework distinto al del ramo?**

Sí, con las mismas condiciones de la Unidad 2: justificación en el README explicando por qué ese framework es la elección correcta para este caso.
