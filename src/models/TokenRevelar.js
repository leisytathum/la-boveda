const mongoose = require('mongoose');

// Registro de cada token de un solo uso emitido por /abrir.
// Se marca "usado" de forma atómica al canjearlo en /revelar.
const tokenRevelarSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    secretoId: { type: String, required: true },
    userId: { type: Number, required: true },
    usado: { type: Boolean, default: false },
    // MongoDB borra el documento solo un rato después de que expira
    expiraEn: { type: Date, required: true, index: { expires: 3600 } },
  },
  { collection: 'tokens_revelar' }
);

module.exports = mongoose.model('TokenRevelar', tokenRevelarSchema);
