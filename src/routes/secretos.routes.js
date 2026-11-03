const { Router } = require('express');
const verificarToken = require('../middleware/auth');
const c = require('../controllers/secretos.controller');

const router = Router();

// Todas las rutas de secretos exigen un JWT válido
router.use(verificarToken);

router.post('/', c.crear);
router.get('/', c.listar);
router.post('/:id/solicitar', c.solicitar);
router.get('/:id/abrir', c.abrir);
router.get('/:id/revelar', c.revelar);

module.exports = router;
