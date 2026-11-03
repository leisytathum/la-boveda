require('dotenv').config();
const express = require('express');
const sequelize = require('./config/mysql');
const conectarMongo = require('./config/mongo');
const authRoutes = require('./routes/auth.routes');
const secretosRoutes = require('./routes/secretos.routes');

// Sin secretos JWT el servidor no debe arrancar
for (const v of ['JWT_SECRET', 'JWT_REVELAR_SECRET', 'MONGO_URI', 'DB_NAME']) {
  if (!process.env[v]) {
    console.error(`Falta la variable ${v} en el archivo .env`);
    process.exit(1);
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => res.json({ mensaje: 'La Bóveda está en línea' }));
app.use('/auth', authRoutes);
app.use('/secretos', secretosRoutes);

// Ruta no encontrada
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Errores: JSON mal escrito -> 400; cualquier otro -> 500 sin mostrar detalles internos
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El body no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // crea la tabla usuarios si no existe
    console.log('Conectado a MySQL');

    await conectarMongo();
    console.log('Conectado a MongoDB');

    app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
  } catch (err) {
    console.error('No se pudo iniciar:', err.message);
    process.exit(1);
  }
}

iniciar();
