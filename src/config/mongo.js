const mongoose = require('mongoose');

async function conectarMongo() {
  await mongoose.connect(process.env.MONGO_URI);
}

module.exports = conectarMongo;
