/*
*==================================================================
* helpers.js
* Funciones auxiliares y utilidades
*
* Responsabilidades:
* - Sanitización de rutas
* - Validación de nombres de archivo
* - Detección de tipos MIME
* - Parseo de multipart/form-data
*/

const path = require('path');

/*
*==================================================================
* Sanitiza una ruta para prevenir path traversal
* @param {string} userPath - Ruta proporcionada por el usuario
* @returns {string} Ruta sanitizada
*/
function sanitizePath(userPath) {
  if (!userPath) return '';

  // Normalizar la ruta
  let sanitized = path.normalize(userPath);

  // Remover intentos de path traversal (../)
  sanitized = sanitized.replace(/^(\.\.[\/\\])+/, '');
  sanitized = sanitized.replace(/[\/\\]\.\.[\/\\]/g, '/');

  // Remover barras al inicio
  sanitized = sanitized.replace(/^[\/\\]+/, '');

  return sanitized;
}

/*
*==================================================================
* Valida que un nombre de archivo sea seguro
* @param {string} filename - Nombre del archivo
* @returns {boolean} True si es válido
*/
function isValidFileName(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Caracteres no permitidos en nombres de archivo
  const invalidChars = /[<>:"|?*\x00-\x1f]/g;

  // Nombres reservados en Windows
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  // Verificar longitud
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }

  // Verificar caracteres inválidos
  if (invalidChars.test(filename)) {
    return false;
  }

  // Verificar nombres reservados
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  if (reservedNames.test(nameWithoutExt)) {
    return false;
  }

  // No permitir solo puntos
  if (/^\.+$/.test(filename)) {
    return false;
  }

  return true;
}

/*
*==================================================================
* Obtiene el tipo MIME de un archivo según su extensión
* @param {string} filename - Nombre del archivo
* @returns {string} Tipo MIME
*/
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes = {
    // Texto
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',

    // Imágenes
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',

    // Documentos
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Archivos comprimidos
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',

    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',

    // Video
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',

    // Otros
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/*
*==================================================================
* Extrae el boundary del header Content-Type
* @param {string} contentType - Header Content-Type completo
* @returns {string|null} Boundary o null si no se encuentra
*/
function extractBoundary(contentType) {
  const match = contentType.match(/boundary=([^;]+)/);
  if (!match) return null;

  let boundary = match[1].trim();

  // Remover comillas si las tiene
  if (boundary.startsWith('"') && boundary.endsWith('"')) {
    boundary = boundary.slice(1, -1);
  }

  return boundary;
}

/*
*==================================================================
* Parsea datos multipart/form-data
* @param {Buffer} buffer - Buffer con los datos
* @param {string} boundary - Boundary del multipart
* @returns {Object} Objeto con fields y files
*/
function parseMultipart(buffer, boundary) {
  const result = {
    fields: {},
    files: []
  };

  // Boundary completo incluye "--" al inicio
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');

  let position = 0;

  while (position < buffer.length) {
    // Buscar el siguiente boundary
    const boundaryIndex = buffer.indexOf(boundaryBuffer, position);

    if (boundaryIndex === -1) break;

    // Mover posición después del boundary
    position = boundaryIndex + boundaryBuffer.length;

    // Buscar fin de línea después del boundary
    const newlineIndex = buffer.indexOf('\r\n', position);
    if (newlineIndex === -1) break;

    position = newlineIndex + 2; // Saltar \r\n

    // Buscar el siguiente boundary para delimitar esta parte
    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, position);
    if (nextBoundaryIndex === -1) break;

    // Extraer esta parte completa
    const partBuffer = buffer.slice(position, nextBoundaryIndex);

    // Separar headers del contenido (headers y contenido están separados por \r\n\r\n)
    const headerEndIndex = partBuffer.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headersBuffer = partBuffer.slice(0, headerEndIndex);
    const contentBuffer = partBuffer.slice(headerEndIndex + 4, -2); // -2 para quitar \r\n final

    // Parsear headers
    const headersText = headersBuffer.toString('utf8');
    const headers     = parseHeaders(headersText);

    // Extraer información del Content-Disposition
    const disposition = headers['content-disposition'];
    if (!disposition) continue;

    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName     = nameMatch[1];
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      // Es un archivo
      const filename    = filenameMatch[1];
      const contentType = headers['content-type'] || 'application/octet-stream';

      result.files.push({
        fieldName,
        filename,
        contentType,
        content: contentBuffer,
        size: contentBuffer.length
      });
    } else {
      // Es un campo de texto
      result.fields[fieldName] = contentBuffer.toString('utf8');
    }

    // Mover posición al siguiente boundary
    position = nextBoundaryIndex;
  }

  return result;
}

/*
*==================================================================
* Parsea headers HTTP
* @param {string} headersText - Texto con los headers
* @returns {Object} Objeto con los headers parseados
*/
function parseHeaders(headersText) {
  const headers = {};
  const lines   = headersText.split('\r\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key   = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    headers[key] = value;
  }

  return headers;
}

/*
*==================================================================
* Formatea el tamaño de un archivo en formato legible
* @param {number} bytes - Tamaño en bytes
* @returns {string} Tamaño formateado (ej: "1.5 MB")
*/
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k     = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/*
*==================================================================
* Verifica si un archivo es una imagen
* @param {string} filename - Nombre del archivo
* @returns {boolean} True si es una imagen
*/
function isImage(filename) {
  const ext             = path.extname(filename).toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.includes(ext);
}

/*
*==================================================================
* Genera un delay (promesa que se resuelve después de X ms)
* @param {number} ms - Milisegundos a esperar
* @returns {Promise<void>}
*/
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*
*==================================================================
* Escapa caracteres especiales de HTML
* @param {string} text - Texto a escapar
* @returns {string} Texto escapado
*/
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

module.exports = {
  sanitizePath,
  isValidFileName,
  getMimeType,
  extractBoundary,
  parseMultipart,
  formatFileSize,
  isImage,
  delay,
  escapeHtml
};