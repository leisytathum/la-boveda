-- Base de datos de La Bóveda (MySQL). La tabla también la crea Sequelize al arrancar.
CREATE DATABASE IF NOT EXISTS boveda_db;
USE boveda_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('agente', 'jefe') NOT NULL DEFAULT 'agente',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- Para probar que el jefe tampoco se salta la regla, después de registrar
-- a un usuario por la API se le puede subir el rol así:
-- UPDATE usuarios SET rol = 'jefe' WHERE email = 'jefe@boveda.com';
