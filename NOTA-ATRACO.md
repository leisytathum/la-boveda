# Nota del atraco

> Completar con lo que pase en la clase. Abajo dejamos los ataques que probamos nosotros mismos.

## Ataques que probamos contra nuestra bóveda

| Ataque | Resultado |
|---|---|
| Registrarse con `"rol": "jefe"` para saltarse la regla | Falló: el rol siempre queda `agente`, y el jefe tampoco se salta la regla. |
| Mandar `userId` y `fecha` falsos en el body de `/solicitar` | Falló: se usan el id del token y la hora del servidor. |
| Crear el secreto con `solicitudes` ya llenas | Falló: `solicitudes` siempre empieza vacío. |
| Que el mismo agente solicite dos veces | Falló: cuenta como uno solo. |
| Creador + un cómplice | Falló: el creador no cuenta para el quórum. |
| Crear un secreto con `fechaApertura` en el pasado | Falló: responde 400. |
| Token JWT con `alg: none` y `rol: jefe` | Falló: 401. |
| Usar el token de revelado de otro agente | Falló: 403, el token es personal. |
| Reusar el token de revelado | Falló: 403, ya fue usado. |
| Inyección NoSQL en login (`{"$ne": null}`) | Falló: 400. |
| Ver el contenido en `GET /secretos` | Falló: el listado nunca lo incluye. |

## Qué ataque recibimos

- Equipo atacante: ____________
- Qué intentaron: ____________
- ¿Funcionó?: ____________

## Qué cambiaríamos
- El quórum lo puede formar **cualquier par de cuentas**, y el registro es libre. Un atacante podría
  crear dos cuentas y abrir un secreto él solo. Para evitarlo: que solo el jefe pueda crear cuentas,
  o que el creador elija qué agentes pueden solicitar su secreto.
- Agregar rate limit también a `/solicitar` y `/abrir`.
- Guardar un registro (log) de cada apertura: quién y cuándo.
