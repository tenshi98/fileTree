/*
*==================================================================
* server.js
* Servidor HTTP principal del explorador de archivos
*
* Responsabilidades:
* - Crear y configurar el servidor HTTP
* - Servir archivos estáticos (HTML, CSS, JS)
* - Delegar peticiones API al router
* - Manejar timeouts y errores generales
*/

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const url    = require('url');
const router = require('./router');
const logger = require('./logger');

// Configuración del servidor
const PORT       = process.env.PORT || 3000;
const TIMEOUT    = 30000; // 30 segundos
const PUBLIC_DIR = path.join(__dirname, '../public');

// Mapeo de extensiones a tipos MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/*
*==================================================================
* Sirve archivos estáticos desde la carpeta public
* @param {http.IncomingMessage} req - Objeto de petición
* @param {http.ServerResponse} res - Objeto de respuesta
*/
function serveStaticFile(req, res) {
  // Parsear la URL y obtener el pathname
  const parsedUrl = url.parse(req.url);
  let pathname    = parsedUrl.pathname;

  // Si es la raíz, servir index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Construir la ruta del archivo
  const filePath = path.join(PUBLIC_DIR, pathname);

  // Verificar que el archivo esté dentro de PUBLIC_DIR (seguridad)
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Obtener la extensión del archivo
  const ext         = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Leer y servir el archivo
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Archivo no encontrado
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Archivo no encontrado</h1>');
      } else {
        // Error del servidor
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Error interno del servidor');
      }
      logger.log('ERROR', `Error sirviendo archivo: ${filePath}`, req.socket.remoteAddress);
    } else {
      // Servir el archivo exitosamente
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

/*
*==================================================================
* Manejador principal de peticiones
* @param {http.IncomingMessage} req - Objeto de petición
* @param {http.ServerResponse} res - Objeto de respuesta
*/
function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;

  // Registrar la petición
  logger.log('REQUEST', `${req.method} ${pathname}`, req.socket.remoteAddress);

  // Configurar CORS para desarrollo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Si la petición es para la API, delegar al router
  if (pathname.startsWith('/api/')) {
    router.handle(req, res);
  } else {
    // Si no es API, servir archivo estático
    serveStaticFile(req, res);
  }
}

/*
*==================================================================
* Crear y configurar el servidor HTTP
*/
const server = http.createServer(requestHandler);

// Configurar timeout para evitar conexiones colgadas
server.timeout = TIMEOUT;

// Manejar errores del servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
    console.error('   Por favor, cierra la aplicación que lo está usando o cambia el puerto');
  } else {
    console.error('❌ Error del servidor:', error.message);
  }
  process.exit(1);
});

// Manejar cierre graceful
process.on('SIGTERM', () => {
  console.log('\n🛑 Señal SIGTERM recibida, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Señal SIGINT recibida, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente');
    process.exit(0);
  });
});

// Iniciar el servidor
server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🗂️  EXPLORADOR DE ARCHIVOS WEB 🗂️          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Servidor iniciado exitosamente`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Carpeta pública: ${PUBLIC_DIR}`);
  console.log(`⏱️  Timeout: ${TIMEOUT / 1000}s`);
  console.log('');
  console.log('Presiona Ctrl+C para detener el servidor');
  console.log('');

  // Verificar que existan las carpetas necesarias
  const filesDir = path.join(__dirname, 'files');
  const logsDir  = path.join(__dirname, 'logs');

  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
    console.log('📂 Carpeta /files creada automáticamente');
  }

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('📝 Carpeta /logs creada automáticamente');
  }

  logger.log('SERVER', `Servidor iniciado en puerto ${PORT}`, 'SYSTEM');
});

module.exports = server;