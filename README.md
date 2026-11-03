# La Boveda  API de secretos con quorum

API REST hecha con **Node.js + Express**. Guarda secretos que nadie puede leer solo:
un secreto se abre unicamente cuando **dos agentes distintos** lo solicitan en menos de
**5 minutos**, o cuando llega su **fecha de apertura**.

| Dato | Base de datos | Herramienta |
|---|---|---|
| Usuarios (agentes) | MySQL | Sequelize |
| Secretos, solicitudes y tokens de un solo uso | MongoDB | Mongoose |
| Autenticacion |  | JWT (jsonwebtoken) + bcrypt (bcryptjs) |

## Estructura

```
la-boveda/
├── database/boveda_db.sql            # crea la base MySQL (opcional, Sequelize crea la tabla)
├── postman/la-boveda.postman_collection.json
├── src/
│   ├── config/mysql.js               # conexion Sequelize
│   ├── config/mongo.js               # conexion Mongoose
│   ├── models/Usuario.js             # MySQL
│   ├── models/Secreto.js             # MongoDB
│   ├── models/TokenRevelar.js        # MongoDB (bonus: tokens de un solo uso)
│   ├── middleware/auth.js            # valida el JWT
│   ├── utils/reglaApertura.js        # regla de quorum / tiempo
│   ├── controllers/                  # auth y secretos
│   ├── routes/                       # /auth y /secretos
│   └── server.js
├── .env.example
├── GUIA-DE-PRUEBA.md                 # prueba paso a paso
└── NOTA-ATRACO.md                    # que ataques recibimos y que cambiariamos
```

## Como correrlo

1. Tener instalado **Node.js** (LTS), **MySQL** y **MongoDB** (Community Server).
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear la base de MySQL (en Workbench o terminal):
   ```sql
   CREATE DATABASE boveda_db;
   ```
   (o ejecutar `database/boveda_db.sql`). La tabla `usuarios` la crea Sequelize al arrancar.
   En MongoDB no hay que crear nada: la base `boveda` se crea sola.
4. Copiar `.env.example` como `.env` y poner tus datos (contraseña de MySQL y dos secretos JWT largos y distintos).
5. Iniciar:
   ```bash
   npm run dev    # desarrollo
   npm start      # normal
   ```
   Debe mostrar:
   ```
   Conectado a MySQL
   Conectado a MongoDB
   Servidor corriendo en http://localhost:3000
   ```

## Variables de entorno

| Variable | Para que |
|---|---|
| `PORT` | Puerto del servidor (3000) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexion a MySQL |
| `MONGO_URI` | Conexion a MongoDB, ej. `mongodb://127.0.0.1:27017/boveda` |
| `JWT_SECRET` | Firma del token de login |
| `JWT_REVELAR_SECRET` | Firma del token de un solo uso (distinto al anterior) |

## Endpoints

Todas las rutas de `/secretos` piden el header `Authorization: Bearer <token>`.

| Metodo | Ruta | Que hace | Respuestas |
|---|---|---|---|
| POST | `/auth/registro` | Crea un agente (contrasena con bcrypt, rol siempre `agente`) | 201, 400, 409 |
| POST | `/auth/login` | Devuelve un JWT `{ id, rol }` que dura 1 hora | 200, 400, 401 |
| POST | `/secretos` | Crea un secreto. `creadoPor` sale del token | 201, 400, 401 |
| GET | `/secretos` | Lista id, titulo, fecha de apertura y numero de solicitudes (nunca el contenido) | 200, 401 |
| POST | `/secretos/:id/solicitar` | Registra la solicitud del agente del token con la hora del servidor | 201, 400, 403, 404 |
| GET | `/secretos/:id/abrir` | Si se cumple la regla, devuelve un **token de un solo uso** (60 s). Si no, 403 diciendo que falta | 200, 403, 404 |
| GET | `/secretos/:id/revelar` | Canjea el token (header `X-Token-Revelar`) por el contenido. Sirve una sola vez | 200, 401, 403 |

### Ejemplos de body

```json
// POST /auth/registro
{ "nombre": "Ana", "email": "ana@boveda.com", "password": "clave1234" }

// POST /secretos  (fechaApertura es opcional y debe ser futura)
{ "titulo": "Operacion Atraco", "contenido": "¡Nos robaron!", "fechaApertura": "2026-12-31T18:00:00Z" }
```

## Regla de apertura (y las preguntas de "Piénsenlo bien")

Un secreto se abre si se cumple **al menos una**:

- **Quórum:** hay solicitudes de **2 agentes distintos** en los **últimos 5 minutos**, y quien abre es uno de ellos.
- **Tiempo:** la hora del servidor es igual o posterior a `fechaApertura`.

| Pregunta | Decision |
|---|---|
| ¿Y si el mismo agente solicita dos veces? | Su solicitud anterior se reemplaza por la nueva. Se cuentan agentes **distintos**, así que nunca cuenta doble. |
| ¿Cuenta el creador para el quórum? | **No.** El creador ya conoce el secreto; si contara, bastaría con un solo agente más. Si intenta solicitar recibe 403. |
| ¿Y si mandan la fecha o su userId en el body? | Se ignoran. El `userId` sale del token y la fecha es la del servidor. Tampoco se aceptan `creadoPor` ni `solicitudes` al crear. |
| ¿El jefe se salta las reglas? | **No.** "Nadie, ni siquiera el jefe". Además nadie puede registrarse como jefe mandando `"rol": "jefe"`. |

## Bonus: token de un solo uso

`/abrir` no devuelve el contenido. Devuelve un JWT firmado con `JWT_REVELAR_SECRET` que:

- expira en **60 segundos**;
- solo sirve para **ese secreto** y **ese agente**;
- tiene un id único (`jti`) guardado en MongoDB. Al canjearlo en `/revelar` se marca `usado: true`
  con una sola operación atómica (`findOneAndUpdate`), así que aunque lleguen dos peticiones a la vez solo una gana.

## Medidas de seguridad

- `contenido` tiene `select: false` en Mongoose: no sale en ninguna consulta salvo en `/revelar`.
- JWT verificado solo con `HS256` (bloquea tokens con `alg: none`). El rol se lee de MySQL, no del token.
- Los tokens de acceso y de revelado usan secretos distintos: uno no sirve como el otro.
- Login con mensaje genérico ("Credenciales incorrectas") y límite de 10 intentos por minuto.
- Se valida que email y password sean texto (bloquea `{"$ne": null}`), y que el id sea un ObjectId válido.
- `fechaApertura` debe ser futura: si no, cualquiera crearía secretos que se abren solos.

## Pruebas

Importar `postman/la-boveda.postman_collection.json` en Postman y ejecutarla con **Run collection**.
Tiene 32 peticiones con 49 verificaciones automáticas. El paso a paso está en
[GUIA-DE-PRUEBA.md](GUIA-DE-PRUEBA.md).
