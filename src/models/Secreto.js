const mongoose = require('mongoose');
const solicitudSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    fecha: { type: Date, required: true },
  },
  { _id: false }
);

const secretoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    // select:false -> el contenido NUNCA sale en una consulta a menos que se pida explícitamente
    contenido: { type: String, required: true, select: false },
    creadoPor: { type: Number, required: true }, // id del usuario en MySQL
    fechaApertura: { type: Date, default: null },
    solicitudes: { type: [solicitudSchema], default: [] },
  },
  { timestamps: true, collection: 'secretos' }
);

module.exports = mongoose.model('Secreto', secretoSchema);
