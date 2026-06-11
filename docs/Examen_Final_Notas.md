# Examen Final — Notas y Respuestas

## Preguntas del examen con respuestas

### Sobre el despliegue

#### ¿Usamos Render?

Sí, el backend está desplegado en Render.

**¿Por qué Render y no otras opciones?**

- **Render vs Railway:** Nos quedamos con Render por comodidad. Parte del despliegue fue visto en clases y para evitar demorar investigando cómo levantar en Railway, preferimos quedarnos con la opción más segura.
- **Render vs Fly.io:** Fly.io no fue viable porque pide tarjeta de crédito para desplegar.

#### ¿Las migraciones están aplicadas?

Sí. Se ejecutó `yarn prisma migrate deploy` en el shell de Render después del primer deploy.

#### ¿Las variables de entorno están configuradas?

Sí. `DATABASE_URL`, `JWT_SECRET`, `R2_*` están configuradas en Render, no en el repositorio.

---

### Sobre la arquitectura

#### ¿Por qué JWT y no sessions?

- Stateless: el servidor no necesita guardar estado del usuario
- Escalable: múltiples instancias sin共享 session store
- Mobile-friendly: el token se guarda en el cliente (secure store)
- Simple: un header `Authorization: Bearer <token>` en cada request

#### ¿Por qué el ownership check está en el controller y no en el repository?

- Separación de responsabilidades: el repository solo accede a datos, el controller maneja lógica de negocio
- El controller tiene acceso al `userId` del middleware
- Permite diferentes respuestas de error (404 vs 403)
- Más fácil de testear y mantener

#### ¿Por qué Prisma y no SQL crudo?

- Type safety: los tipos se infieren del schema
- Migraciones automáticas
- Mejor DX: autocompletado, errores en compile time
- Relaciones fáciles de manejar con `include`

#### ¿Por qué bcryptjs y no SHA-256?

- bcrypt añade salt automáticamente
- bcrypt es intencionalmente lento (previene brute force)
- SHA-256 es rápido → vulnerable a rainbow tables
- bcrypt adapta la dificultad con el factor de costo

---

### Sobre la estructura de carpetas

```
src/
├── index.ts          → Entry point, monta rutas y middleware
├── routes/           → Mapea URLs a controllers
├── controllers/      → Lógica de negocio, valida, coordina
├── repositories/     → Acceso a datos (Prisma)
├── schemas/          → Validación con Zod
├── middlewares/       → Auth middleware (JWT)
├── lib/              → Utilidades (prisma, upload, errors)
└── generated/        → Código generado por Prisma (no editar)
```

**¿Por qué esa separación?**
- Cada capa tiene una única responsabilidad
- Fácil de testear por separado
- Escalable: cambiar la DB no afecta controllers
- Mantenible: nuevo dev entiende el código rápido

---

### Sobre los endpoints

#### ¿Por qué las categorías son globales y las transacciones por usuario?

- Categorías son catálogos compartidos (Alimentación, Transporte, etc.)
- Transacciones son datos privados de cada usuario
- Permite reutilizar categorías sin duplicarlas
- Ownership check en transacciones, no en categorías

#### ¿Por qué la API es RESTful?

- Convención estándar: GET (leer), POST (crear), PATCH (actualizar), DELETE (eliminar)
- URLs predecibles: `/transactions`, `/transactions/:id`
- Códigos de estado HTTP semánticos: 200, 201, 400, 401, 404, 409
- Fácil de consumir desde cualquier cliente

---

### Sobre seguridad

#### ¿Cómo se protegen las contraseñas?

- bcrypt con salt (factor de costo 10)
- Nunca se almacena la contraseña original
- El hash se guarda en `passwordHash`

#### ¿Cómo se autentica cada request?

- Header `Authorization: Bearer <token>`
- Middleware verifica el JWT en cada request protegido
- Si es válido, extrae `userId` y lo guarda en el contexto
- Si no es válido, retorna 401

#### ¿Qué pasa si el token expira?

- El access token expira en 15 minutos
- El cliente debe enviar `refreshToken` a `/auth/refresh`
- Se emiten nuevos tokens
- Si no se refresca, el usuario debe volver a login

---

## Checklist antes del video

- [ ] API responde en URL pública
- [ ] Flujo completo funciona: register → login → crear transacción → balance
- [ ] Migraciones aplicadas en producción
- [ ] Variables de entorno en Render (no en código)
- [ ] Deploy automático con git push
- [ ] README con URL de la API
- [ ] Video máximo 5 minutos
- [ ] Cada integrante puede explicar el código

---

## Tips para el video

1. **Mostrar la API funcionando** — Bruno o curl apuntando a la URL pública
2. **Explicar el código** — Mostrar la estructura de carpetas y explicar cada capa
3. **Defender decisiones** — No decir "lo copié", sino "lo elegimos porque..."
4. **Ser conciso** — 5 minutos va rápido, practicar antes
