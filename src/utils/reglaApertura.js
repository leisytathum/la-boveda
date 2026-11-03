const VENTANA_MS = 5 * 60 * 1000; // 5 minutos

// Devuelve si el secreto se puede abrir y, si no, qué falta.
// Todo se calcula con la hora del SERVIDOR, nunca con datos del cliente.
function evaluarApertura(secreto, userId, ahora = new Date()) {
  // Condición de quórum: agentes DISTINTOS, que no sean el creador,
  // con solicitud dentro de los últimos 5 minutos
  const desde = ahora.getTime() - VENTANA_MS;
  const activos = new Set(
    secreto.solicitudes
      .filter((s) => s.fecha.getTime() >= desde && s.fecha.getTime() <= ahora.getTime())
      .filter((s) => s.userId !== secreto.creadoPor)
      .map((s) => s.userId)
  );

  // Condición de tiempo
  if (secreto.fechaApertura && ahora >= secreto.fechaApertura) {
    return { puede: true, motivo: 'tiempo', agentesActivos: activos.size };
  }

  if (activos.size >= 2 && activos.has(userId)) {
    return { puede: true, motivo: 'quorum', agentesActivos: activos.size };
  }

  // Armar el mensaje de qué falta
  const faltan = [];
  if (activos.size < 2) {
    faltan.push(
      `faltan ${2 - activos.size} solicitud(es) de agentes distintos en los últimos 5 minutos ` +
        `(hay ${activos.size}; el creador no cuenta)`
    );
  } else if (!activos.has(userId)) {
    faltan.push('tú no tienes una solicitud activa: solo pueden abrirlo los agentes que lo solicitaron');
  }
  if (secreto.fechaApertura) {
    faltan.push(`o esperar a la fecha de apertura ${secreto.fechaApertura.toISOString()}`);
  } else {
    faltan.push('este secreto no tiene fecha de apertura programada');
  }

  return { puede: false, agentesActivos: activos.size, faltan };
}

module.exports = { evaluarApertura, VENTANA_MS };
