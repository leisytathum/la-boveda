const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Secreto = require('../models/Secreto');
const TokenRevelar = require('../models/TokenRevelar');
const { evaluarApertura } = require('../utils/reglaApertura');

const esTexto = (v) => typeof v === 'string' && v.trim() !== '';
const idValido = (id) => mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === id;

async function buscarSecreto(id, res, campos) {
  if (!idValido(id)) {
    res.status(400).json({ error: 'El id del secreto no es válido' });
    return null;
  }
  const secreto = await Secreto.findById(id).select(campos);
  if (!secreto) {
    res.status(404).json({ error: 'Secreto no encontrado' });
    return null;
  }
  return secreto;
}

// POST /secretos
async function crear(req, res) {
  const { titulo, contenido, fechaApertura } = req.body || {};
  if (!esTexto(titulo) || !esTexto(contenido)) {
    return res.status(400).json({ error: 'titulo y contenido son obligatorios (texto)' });
  }

  let fecha = null;
  if (fechaApertura !== undefined && fechaApertura !== null && fechaApertura !== '') {
    fecha = new Date(fechaApertura);
    if (typeof fechaApertura !== 'string' || isNaN(fecha.getTime())) {
      return res.status(400).json({ error: 'Fecha de aprertura debe ser una fecha válida, ej: 2026-12-31T18:00:00Z' });
    }
    if (fecha <= new Date()) {
      return res.status(400).json({ error: 'Fecha de apertura debe estar en el futuro' });
    }
  }

  // Solo se usan los campos permitidos. creadoPor sale del TOKEN, no del body,
  // y solicitudes siempre empieza vacío.
  const secreto = await Secreto.create({
    titulo: titulo.trim(),
    contenido,
    creadoPor: req.usuario.id,
    fechaApertura: fecha,
    solicitudes: [],
  });

  res.status(201).json({
    mensaje: 'Secreto guardado en la bóveda',
    secreto: {
      id: secreto._id,
      titulo: secreto.titulo,
      creadoPor: secreto.creadoPor,
      fechaApertura: secreto.fechaApertura,
    },
  });
}

// GET /secretos  (NUNCA incluye el contenido)
async function listar(req, res) {
  const secretos = await Secreto.find().select('titulo fechaApertura solicitudes').sort({ createdAt: -1 });

  res.json(
    secretos.map((s) => ({
      id: s._id,
      titulo: s.titulo,
      fechaApertura: s.fechaApertura,
      numeroSolicitudes: s.solicitudes.length,
    }))
  );
}

// POST /secretos/:id/solicitar
async function solicitar(req, res) {
  const secreto = await buscarSecreto(req.params.id, res, 'creadoPor');
  if (!secreto) return;

  const userId = req.usuario.id; // del token, jamás del body

  if (secreto.creadoPor === userId) {
    return res.status(403).json({
      error: 'El creador del secreto no puede solicitarlo: no cuenta para el quórum',
    });
  }

  // Si el agente ya tenía una solicitud, se reemplaza por una nueva con la hora del servidor.
  // Así el mismo agente nunca cuenta dos veces.
  await Secreto.updateOne({ _id: secreto._id }, { $pull: { solicitudes: { userId } } });
  await Secreto.updateOne(
    { _id: secreto._id },
    { $push: { solicitudes: { userId, fecha: new Date() } } }
  );

  const actualizado = await Secreto.findById(secreto._id).select('creadoPor fechaApertura solicitudes');
  const estado = evaluarApertura(actualizado, userId);

  res.status(201).json({
    mensaje: 'Solicitud registrada',
    agentesConSolicitudActiva: estado.agentesActivos,
    sePuedeAbrir: estado.puede,
  });
}

// GET /secretos/:id/abrir  (bonus: devuelve un token de un solo uso)
async function abrir(req, res) {
  const secreto = await buscarSecreto(req.params.id, res, 'creadoPor fechaApertura solicitudes');
  if (!secreto) return;

  // Nadie se salta la regla, ni siquiera el rol 'jefe'
  const estado = evaluarApertura(secreto, req.usuario.id);

  if (!estado.puede) {
    return res.status(403).json({
      error: 'La bóveda sigue cerrada',
      faltan: estado.faltan,
    });
  }

  const jti = crypto.randomUUID();
  const expiraEn = new Date(Date.now() + 60 * 1000);

  await TokenRevelar.create({
    jti,
    secretoId: String(secreto._id),
    userId: req.usuario.id,
    expiraEn,
  });

  const tokenRevelar = jwt.sign(
    { secretoId: String(secreto._id), userId: req.usuario.id, jti },
    process.env.JWT_REVELAR_SECRET,
    { expiresIn: 60, algorithm: 'HS256' }
  );

  res.json({
    mensaje: `Regla cumplida (${estado.motivo}). Canjea el token en GET /secretos/${secreto._id}/revelar`,
    tokenRevelar,
    expiraEnSegundos: 60,
    comoUsarlo: 'Envía el token en el header X-Token-Revelar. Solo sirve una vez.',
  });
}

// GET /secretos/:id/revelar  (canjea el token de un solo uso)
async function revelar(req, res) {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ error: 'El id del secreto no es válido' });
  }

  const token = req.headers['x-token-revelar'];
  if (!token) {
    return res.status(401).json({ error: 'Falta el header X-Token-Revelar (lo da GET /secretos/:id/abrir)' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REVELAR_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'El token de revelado expiró (dura 60 segundos). Vuelve a llamar a /abrir'
      : 'Token de revelado inválido';
    return res.status(401).json({ error: msg });
  }

  // El token es solo para ESTE secreto y para ESTE agente
  if (payload.secretoId !== req.params.id || payload.userId !== req.usuario.id) {
    return res.status(403).json({ error: 'Este token no corresponde a este secreto o a este agente' });
  }

  // Marcar como usado de forma atómica: si dos peticiones llegan a la vez, solo una gana
  const registro = await TokenRevelar.findOneAndUpdate(
    { jti: payload.jti, secretoId: payload.secretoId, userId: payload.userId, usado: false },
    { $set: { usado: true } }
  );
  if (!registro) {
    return res.status(403).json({ error: 'Este token ya fue usado. Cada token sirve una sola vez' });
  }

  const secreto = await Secreto.findById(req.params.id).select('+contenido titulo');
  if (!secreto) {
    return res.status(404).json({ error: 'Secreto no encontrado' });
  }

  res.json({ id: secreto._id, titulo: secreto.titulo, contenido: secreto.contenido });
}

module.exports = { crear, listar, solicitar, abrir, revelar };
