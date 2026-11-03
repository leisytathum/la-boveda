# Guía de prueba paso a paso - La Boveda

Esta guia prueba toda la actividad en orden. En cada paso dice **que hacer**, **que debe salir**
y **de que tomar captura** para el informe.

---

## Parte 0. Preparar todo

### Paso 0.1 - Instalar lo necesario
- **Node.js** LTS
- **MySQL** + **MySQL Workbench**
- **MongoDB Community Server** + **MongoDB Compass** (Compass viene en el mismo instalador)
- **Postman**

### Paso 0.2 - Crear la base de MySQL
En Workbench ejecuta:
```sql
CREATE DATABASE boveda_db;
```
En MongoDB no hay que crear nada.

### Paso 0.3 - Configurar el proyecto
1. Abre la carpeta `la-boveda` en VS Code y abre una terminal.
2. Ejecuta `npm install`.
3. Copia `.env.example`, renombralo a `.env` y cambia:
   - `DB_PASSWORD` -> tu contrasena de MySQL
   - `JWT_SECRET` y `JWT_REVELAR_SECRET` -> dos frases largas cualquiera, distintas entre si

### Paso 0.4 - Arrancar el servidor
```bash
npm run dev
```
 Debe salir:
```
Conectado a MySQL
Conectado a MongoDB
Servidor corriendo en http://localhost:3000
```
 **Captura 1:** la terminal con esos tres mensajes.

### Paso 0.5 - Importar la coleccion
En Postman: **Import** -> elige `postman/la-boveda.postman_collection.json`.
Aparece la coleccion **La Boveda API** con 3 carpetas.

> La coleccion guarda sola los tokens y el id del secreto en variables, asi que no tienes que copiar nada a mano.
> Solo ejecuta las peticiones **en el orden** en que aparecen.

---

## Parte 1. Flujo completo (carpeta "1. Flujo completo")

Abre cada peticion, dale **Send** y revisa el código de respuesta (arriba a la derecha) y la pestana **Test Results**.

| # | Peticion | Debe responder | Que demuestra |
|---|---|---|---|
| 1 | Registro agente A | **201** | Se crea un agente. No devuelve la contrasena. |
| 2 | Registro agente B | **201** con `"rol": "agente"` | Aunque el body manda `"rol": "jefe"`, queda como agente. |
| 3 | Registro agente C | **201** | Tercer agente. |
| 4 | Login agente A | **200** con `token` | Login con JWT. |
| 5 | Login agente B | **200** | |
| 6 | Login agente C | **200** | |
| 7 | Crear secreto (agente A) | **201** | Se crea "¡Nos robaron!". El body trae `creadoPor: 999` y solicitudes falsas, y la API las ignora (`creadoPor` es el id de A). |
| 8 | Listar secretos | **200** | Sale id, título, fecha y `numeroSolicitudes: 0`. **Nunca** sale `contenido`. |
| 9 | Abrir sin quórum | **403** | Mensaje con lo que falta: "faltan 2 solicitud(es)". |
| 10 | Creador solicita | **403** | El creador no cuenta para el quorum. |
| 11 | Agente B solicita | **201**, `agentesConSolicitudActiva: 1` | El body trae userId y fecha falsos; se ignoran. |
| 12 | Agente B solicita otra vez | **201**, sigue en **1** | El mismo agente no cuenta doble. |
| 13 | Agente B intenta abrir | **403** | "faltan 1 solicitud(es)". |
| 14 | Agente C solicita | **201**, `sePuedeAbrir: true` | Ya hay 2 agentes distintos. |
| 15 | Creador intenta abrir | **403** | A no solicitó, asi que no puede abrir. |
| 16 | Agente C abre | **200** con `tokenRevelar` | **Bonus:** no da el contenido, da un token de 60 s. |
| 17 | Agente B usa el token de C | **403** | El token es personal. |
| 18 | Agente C revela el secreto | **200** con `"contenido": "¡Nos robaron!"` | Se canjea el token. |
| 19 | Agente C reusa el token | **403** "ya fue usado" | El token sirve una sola vez. |

 **Capturas sugeridas:** 2 (rol agente), 7, 8 (sin contenido), 9 (mensaje de lo que falta), 12, 14, 16, 18 y 19.

>  Entre el paso 16 y el 18 tienes **60 segundos**. Si te sale "expiró", vuelve a ejecutar el 16.
>  Las solicitudes valen **5 minutos**. Si tardas más entre el 11 y el 16, repite desde el 11.

---

## Parte 2. Apertura por tiempo (carpeta "2. Apertura por tiempo")

| # | Petición | Debe responder | Que demuestra |
|---|---|---|---|
| 1 | Crear secreto programado | **201** | Se crea con `fechaApertura` = ahora + 5 segundos. |
| 2 | Abrir antes de la fecha | **403** | Todavia no llega la fecha. |
| 3 | Abrir después de la fecha | **200** con `tokenRevelar` | **Espera 5 segundos** antes de darle Send. Se abre sin quórum. |
| 4 | Revelar secreto programado | **200** "Se abrio por tiempo" | |
| 5 | Fecha en el pasado | **400** | No se aceptan fechas pasadas. |

 **Capturas:** 2 y 3.

---

## Parte 3. Intentos de ataque (carpeta "3. Intentos de ataque")

| # | Peticion | Debe responder | Ataque que bloquea |
|---|---|---|---|
| 1 | Sin token | **401** | Entrar sin login. |
| 2 | Token inventado | **401** | Token falso con `alg: none` y `rol: jefe`. |
| 3 | Token de revelado como acceso | **401** | Reusar un token para otra cosa. |
| 4 | Contrasena incorrecta | **401** "Credenciales incorrectas" | No dice si el email existe. |
| 5 | Inyeccion NoSQL | **400** | `{"$ne": null}` en el login. |
| 6 | Id inválido | **400** | |
| 7 | Secreto que no existe | **404** | |
| 8 | Revelar sin token de revelado | **401** | Saltarse `/abrir`. |

 **Captura:** 2 y 5.

---

## Parte 4. El jefe tampoco se salta la regla

1. En Workbench:
   ```sql
   USE boveda_db;
   UPDATE usuarios SET rol = 'jefe' WHERE nombre = 'Agente B';
   ```
2. En Postman ejecuta **Crear secreto (agente A)** otra vez (crea uno nuevo).
3. Ejecuta **Abrir sin quorum** (usa el token de B).

Debe responder **403**.  **Captura** de la consulta y del 403.

---

## Parte 5. Revisar las bases de datos

**MySQL (Workbench):**
```sql
SELECT id, nombre, email, password, rol FROM boveda_db.usuarios;
```
 La columna `password` empieza con `$2b$10$…` (hash bcrypt, no la contraseña real).
 **Captura.**

**MongoDB (Compass):** conéctate a `mongodb://127.0.0.1:27017` → base `boveda`.
- Colección `secretos`: cada secreto con `creadoPor` (número) y `solicitudes` con `userId` y `fecha`.
- Colección `tokens_revelar`: los tokens canjeados con `usado: true`.

 **Captura** de cada colección.

---

## Parte 6. Correr todo de una vez (opcional)

En Postman: clic derecho en la colección → **Run collection** → **Run La Bóveda API**.
 Deben salir **32 peticiones** y **49 pruebas aprobadas**, 0 fallidas.
 **Captura** del resumen.

> Si sale "Demasiados intentos", espera un minuto: el login permite 10 intentos por minuto (es una defensa contra fuerza bruta).

---

## Problemas comunes

| Error | Solucion |
|---|---|
| `Access denied for user` | Revisa `DB_USER` y `DB_PASSWORD` en `.env`. |
| `Unknown database 'boveda_db'` | Falta el paso 0.2. |
| `connect ECONNREFUSED 127.0.0.1:27017` | MongoDB no está encendido (en Windows: Servicios → MongoDB → Iniciar). |
| `Falta la variable JWT_SECRET` | No creaste el `.env` o le falta esa línea. |
| 401 "El token expiró" | Vuelve a hacer login (dura 1 hora). |
| 403 "faltan 1 solicitud(es)" cuando ya solicitaron | Pasaron más de 5 minutos: repite las solicitudes. |
