/*
*==================================================================
* router.js
* Enrutador de peticiones API
*
* Responsabilidades:
* - Parsear URLs y métodos HTTP
* - Enrutar peticiones a controladores correspondientes
* - Implementar rate limiting básico
* - Manejar errores 404
*/

const url            = require('url');
const fileController = require('./fileController');
const logger         = require('./logger');

// Rate limiting: almacena contador de peticiones por IP
const rateLimitMap      = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS      = 100; // Máximo de peticiones por ventana

/*
*==================================================================
* Verifica si una IP ha excedido el límite de peticiones
* @param {string} ip - Dirección IP
* @returns {boolean} True si se permite la petición
*/
function checkRateLimit(ip) {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const record = rateLimitMap.get(ip);

  // Si la ventana de tiempo ha expirado, reiniciar contador
  if (now > record.resetTime) {
    record.count     = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return true;
  }

  // Incrementar contador
  record.count++;

  // Verificar si se excedió el límite
  if (record.count > MAX_REQUESTS) {
    return false;
  }

  return true;
}

/*
*==================================================================
* Limpia entradas antiguas del mapa de rate limiting
* Se ejecuta cada minuto
*/
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

/*
*==================================================================
* Tabla de rutas: mapea método + ruta a controlador
*/
const routes = {
  'GET /api/files': fileController.listFiles,
  'POST /api/rename': fileController.renameFile,
  'DELETE /api/delete': fileController.deleteFile,
  'GET /api/download': fileController.downloadFile,
  'POST /api/upload': fileController.uploadFile,
  'GET /api/health': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Servidor funcionando correctamente',
      timestamp: new Date().toISOString()
    }));
  }
};

/*
*==================================================================
* Envía una respuesta de error
* @param {http.ServerResponse} res - Objeto de respuesta
* @param {number} statusCode - Código de estado HTTP
* @param {string} message - Mensaje de error
*/
function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: message
  }));
}

/*
*==================================================================
* Manejador principal del router
* @param {http.IncomingMessage} req - Objeto de petición
* @param {http.ServerResponse} res - Objeto de respuesta
*/
function handle(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;
  const method    = req.method;
  const ip        = req.socket.remoteAddress;

  // Verificar rate limiting
  if (!checkRateLimit(ip)) {
    logger.log('RATE_LIMIT', `IP bloqueada: ${ip}`, ip);
    sendError(res, 429, 'Demasiadas peticiones. Por favor, intenta más tarde.');
    return;
  }

  // Construir la clave de ruta
  const routeKey = `${method} ${pathname}`;

  // Buscar el controlador correspondiente
  const handler = routes[routeKey];

  if (handler) {
    try {
      // Ejecutar el controlador
      handler(req, res);
    } catch (error) {
      logger.log('ERROR', `Error en controlador ${routeKey}: ${error.message}`, ip);
      sendError(res, 500, 'Error interno del servidor');
    }
  } else {
    // Ruta no encontrada
    logger.log('404', `Ruta no encontrada: ${routeKey}`, ip);
    sendError(res, 404, `Ruta no encontrada: ${pathname}`);
  }
}

/*
*==================================================================
* Registra una nueva ruta
* @param {string} method - Método HTTP (GET, POST, etc.)
* @param {string} path - Ruta del endpoint
* @param {Function} handler - Función controladora
*/
function register(method, path, handler) {
  const routeKey   = `${method} ${path}`;
  routes[routeKey] = handler;
  logger.log('ROUTE', `Ruta registrada: ${routeKey}`, 'SYSTEM');
}

/*
*==================================================================
* Obtiene estadísticas del rate limiting
* @returns {Object} Objeto con estadísticas
*/
function getRateLimitStats() {
  return {
    totalIPs: rateLimitMap.size,
    details: Array.from(rateLimitMap.entries()).map(([ip, record]) => ({
      ip,
      count: record.count,
      resetTime: new Date(record.resetTime).toISOString()
    }))
  };
}

module.exports = {
  handle,
  register,
  getRateLimitStats
};