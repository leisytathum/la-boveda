const { DataTypes } = require('sequelize');
const sequelize = require('../config/mysql');

const Usuario = sequelize.define(
  'Usuario',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }, // hash bcrypt
    rol: {
      type: DataTypes.ENUM('agente', 'jefe'),
      allowNull: false,
      defaultValue: 'agente',
    },
  },
  { tableName: 'usuarios' }
);

module.exports = Usuario;
