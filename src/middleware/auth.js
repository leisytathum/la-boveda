const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Valida el JWT de acceso en el header: Authorization: Bearer <token>
async function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token. Usa el header Authorization: Bearer <token>' });
  }

  let payload;
  try {
    // algorithms fijo: evita el ataque de cambiar el algoritmo a "none"
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'El token expiró, vuelve a iniciar sesión' : 'Token inválido';
    return res.status(401).json({ error: msg });
  }

  // Confirmar que el agente sigue existiendo y tomar su rol desde la BD
  const usuario = await Usuario.findByPk(payload.id, { attributes: ['id', 'nombre', 'rol'] });
  if (!usuario) {
    return res.status(401).json({ error: 'El usuario del token ya no existe' });
  }

  req.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  next();
}
module.exports = verificarToken;
