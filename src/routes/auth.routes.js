const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { registro, login } = require('../controllers/auth.controller');

const router = Router();

// Freno contra fuerza bruta: máximo 10 intentos por minuto por IP
const limitador = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos, espera un minuto' },
});

router.post('/registro', limitador, registro);
router.post('/login', limitador, login);

module.exports = router;
