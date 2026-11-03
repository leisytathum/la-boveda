const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esTexto = (v) => typeof v === 'string' && v.trim() !== '';

// POST /auth/registro
async function registro(req, res) {
  const { nombre, email, password } = req.body || {};

  if (!esTexto(nombre) || !esTexto(email) || !esTexto(password)) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios (texto)' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const emailNormal = email.trim().toLowerCase();
  const existe = await Usuario.findOne({ where: { email: emailNormal } });
  if (existe) {
    return res.status(409).json({ error: 'Ese email ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  // El rol NO se toma del body: todo registro es 'agente'.
  // Así nadie puede registrarse como 'jefe' mandando "rol": "jefe".
  const usuario = await Usuario.create({
    nombre: nombre.trim(),
    email: emailNormal,
    password: hash,
    rol: 'agente',
  });

  res.status(201).json({
    mensaje: 'Agente registrado',
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}

// POST /auth/login
async function login(req, res) {
  const { email, password } = req.body || {};

  if (!esTexto(email) || !esTexto(password)) {
    return res.status(400).json({ error: 'email y password son obligatorios (texto)' });
  }
  const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });
  const valido = usuario && (await bcrypt.compare(password, usuario.password));

  // Mismo mensaje si el email no existe o si la contraseña está mal,
  // para no revelarle al atacante qué cuentas existen.
  if (!valido) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });

  res.json({ mensaje: 'Login correcto', token, expiraEn: '1h' });
}

module.exports = { registro, login };
