/*
*==================================================================
* logger.js
* Sistema de registro de eventos y operaciones
*
* Responsabilidades:
* - Registrar todas las operaciones del sistema
* - Incluir timestamp, IP, acción y detalles
* - Escribir en archivo de log
* - Formatear mensajes de forma legible
*/

const fs   = require('fs');
const path = require('path');

// Ruta del archivo de log
const LOG_FILE = path.join(__dirname, 'logs', 'app.log');

// Colores para consola (códigos ANSI)
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m'
};

// Mapeo de tipo de evento a color
const EVENT_COLORS = {
  'SERVER': COLORS.GREEN,
  'REQUEST': COLORS.CYAN,
  'LIST': COLORS.BLUE,
  'UPLOAD': COLORS.GREEN,
  'DOWNLOAD': COLORS.MAGENTA,
  'RENAME': COLORS.YELLOW,
  'DELETE': COLORS.RED,
  'ERROR': COLORS.RED,
  'RATE_LIMIT': COLORS.RED,
  'ROUTE': COLORS.GRAY,
  '404': COLORS.YELLOW
};

/*
*==================================================================
* Formatea una fecha en formato legible
* @param {Date} date - Objeto Date
* @returns {string} Fecha formateada
*/
function formatDate(date) {
  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0');
  const day     = String(date.getDate()).padStart(2, '0');
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms      = String(date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/*
*==================================================================
* Registra un evento en el log
* @param {string} eventType - Tipo de evento (LIST, UPLOAD, DELETE, etc.)
* @param {string} message - Mensaje descriptivo
* @param {string} ip - Dirección IP del cliente
*/
function log(eventType, message, ip = 'N/A') {
  const timestamp     = new Date();
  const formattedDate = formatDate(timestamp);

  // Construir mensaje de log
  const logMessage = `[${formattedDate}] [${eventType}] [${ip}] ${message}`;

  // Escribir en archivo de log (de forma asíncrona)
  fs.appendFile(LOG_FILE, logMessage + '\n', (err) => {
    if (err) {
      console.error('Error escribiendo en log:', err.message);
    }
  });

  // Mostrar en consola con colores
  const color       = EVENT_COLORS[eventType] || COLORS.WHITE;
  const coloredType = `${color}${eventType.padEnd(12)}${COLORS.RESET}`;
  const grayDate    = `${COLORS.GRAY}${formattedDate}${COLORS.RESET}`;
  const grayIP      = `${COLORS.GRAY}${ip.padEnd(15)}${COLORS.RESET}`;

  console.log(`${grayDate} ${coloredType} ${grayIP} ${message}`);
}

/*
*==================================================================
* Registra un error con stack trace
* @param {Error} error - Objeto de error
* @param {string} context - Contexto donde ocurrió el error
* @param {string} ip - Dirección IP del cliente
*/
function logError(error, context, ip = 'N/A') {
  const timestamp = formatDate(new Date());

  const errorLog = `
${'='.repeat(80)}
[${timestamp}] [ERROR] [${ip}]
Contexto: ${context}
Mensaje: ${error.message}
Stack:
${error.stack}
${'='.repeat(80)}
`;

  // Escribir en archivo
  fs.appendFile(LOG_FILE, errorLog, (err) => {
    if (err) {
      console.error('Error escribiendo error en log:', err.message);
    }
  });

  // Mostrar en consola
  console.error(`${COLORS.RED}[ERROR]${COLORS.RESET} ${context}: ${error.message}`);
}

/*
*==================================================================
* Lee las últimas N líneas del archivo de log
* @param {number} lines - Número de líneas a leer
* @returns {Promise<string>} Contenido del log
*/
function readLog(lines = 100) {
  return new Promise((resolve, reject) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve('Log vacío - no hay registros aún');
        } else {
          reject(err);
        }
        return;
      }

      const allLines = data.split('\n').filter(line => line.trim());
      const lastLines = allLines.slice(-lines);
      resolve(lastLines.join('\n'));
    });
  });
}

/*
*==================================================================
* Limpia el archivo de log
* @returns {Promise<void>}
*/
function clearLog() {
  return new Promise((resolve, reject) => {
    fs.writeFile(LOG_FILE, '', (err) => {
      if (err) {
        reject(err);
      } else {
        log('SYSTEM', 'Log limpiado', 'SYSTEM');
        resolve();
      }
    });
  });
}

/*
*==================================================================
* Obtiene estadísticas del log
* @returns {Promise<Object>} Estadísticas
*/
async function getLogStats() {
  try {
    const content = await readLog(10000); // Últimas 10000 líneas
    const lines   = content.split('\n');

    const stats = {
      totalEvents: lines.length,
      byType: {},
      byIP: {}
    };

    lines.forEach(line => {
      // Extraer tipo de evento: [TIPO]
      const typeMatch = line.match(/\[([A-Z_]+)\]/g);
      if (typeMatch && typeMatch[1]) {
        const type = typeMatch[1].replace(/[\[\]]/g, '');
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }

      // Extraer IP
      const ipMatch = line.match(/\[(\d+\.\d+\.\d+\.\d+)\]/);
      if (ipMatch && ipMatch[1]) {
        const ip = ipMatch[1];
        stats.byIP[ip] = (stats.byIP[ip] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    return { error: error.message };
  }
}

// Asegurar que existe el directorio de logs
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Asegurar que existe el archivo de log
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '');
}

module.exports = {
  log,
  logError,
  readLog,
  clearLog,
  getLogStats
};