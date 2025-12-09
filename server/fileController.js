/*
*==================================================================
* fileController.js
* Controladores para los endpoints de la API
*
* Responsabilidades:
* - Validar peticiones entrantes
* - Llamar a los servicios correspondientes
* - Formatear respuestas JSON
* - Manejar errores HTTP
*/

const url         = require('url');
const fileService = require('./fileService');
const logger      = require('./logger');
const helpers     = require('./helpers');

/*
*==================================================================
* Envía una respuesta JSON exitosa
* @param {http.ServerResponse} res - Objeto de respuesta
* @param {*} data - Datos a enviar
* @param {number} statusCode - Código de estado (default: 200)
*/
function sendSuccess(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    data: data
  }));
}

/*
*==================================================================
* Envía una respuesta JSON de error
* @param {http.ServerResponse} res - Objeto de respuesta
* @param {string} message - Mensaje de error
* @param {number} statusCode - Código de estado (default: 400)
*/
function sendError(res, message, statusCode = 400) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: message
  }));
}

/*
*==================================================================
* Lee el cuerpo de la petición
* @param {http.IncomingMessage} req - Objeto de petición
* @returns {Promise<string>} Cuerpo de la petición como string
*/
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

/*
*==================================================================
* GET /api/files
* Lista archivos y carpetas de forma recursiva
*/
async function listFiles(req, res) {
  try {
    const parsedUrl    = url.parse(req.url, true);
    const relativePath = parsedUrl.query.path || '';
    const ip           = req.socket.remoteAddress;

    logger.log('LIST', `Listando: ${relativePath || '/'}`, ip);

    const tree = await fileService.listFiles(relativePath);
    sendSuccess(res, tree);

  } catch (error) {
    logger.log('ERROR', `Error listando archivos: ${error.message}`, req.socket.remoteAddress);
    sendError(res, error.message, 500);
  }
}

/*
*==================================================================
* POST /api/rename
* Renombra un archivo o carpeta
*/
async function renameFile(req, res) {
  try {
    const body                 = await readBody(req);
    const { oldPath, newName } = JSON.parse(body);
    const ip                   = req.socket.remoteAddress;

    // Validaciones
    if (!oldPath || !newName) {
      sendError(res, 'Se requieren oldPath y newName');
      return;
    }

    if (!helpers.isValidFileName(newName)) {
      sendError(res, 'Nombre de archivo inválido. No usar caracteres especiales.');
      return;
    }

    logger.log('RENAME', `${oldPath} -> ${newName}`, ip);

    const result = await fileService.renameFile(oldPath, newName);
    sendSuccess(res, result);

  } catch (error) {
    logger.log('ERROR', `Error renombrando: ${error.message}`, req.socket.remoteAddress);
    sendError(res, error.message, 500);
  }
}

/*
*==================================================================
* DELETE /api/delete
* Elimina un archivo o carpeta
*/
async function deleteFile(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const filePath  = parsedUrl.query.path;
    const ip        = req.socket.remoteAddress;

    // Validaciones
    if (!filePath) {
      sendError(res, 'Se requiere el parámetro path');
      return;
    }

    logger.log('DELETE', filePath, ip);

    const result = await fileService.deleteFile(filePath);
    sendSuccess(res, result);

  } catch (error) {
    logger.log('ERROR', `Error eliminando: ${error.message}`, req.socket.remoteAddress);
    sendError(res, error.message, 500);
  }
}

/*
*==================================================================
* GET /api/download
* Descarga un archivo
*/
async function downloadFile(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const filePath  = parsedUrl.query.path;
    const ip        = req.socket.remoteAddress;

    // Validaciones
    if (!filePath) {
      sendError(res, 'Se requiere el parámetro path');
      return;
    }

    logger.log('DOWNLOAD', filePath, ip);

    const fileData = await fileService.downloadFile(filePath);

    // Configurar headers para descarga
    res.writeHead(200, {
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
      'Content-Length': fileData.content.length
    });

    res.end(fileData.content);

  } catch (error) {
    logger.log('ERROR', `Error descargando: ${error.message}`, req.socket.remoteAddress);
    sendError(res, error.message, 500);
  }
}

/*
*==================================================================
* POST /api/upload
* Sube uno o más archivos
*/
async function uploadFile(req, res) {
  try {
    const ip          = req.socket.remoteAddress;
    const contentType = req.headers['content-type'];

    // Verificar que sea multipart/form-data
    if (!contentType || !contentType.includes('multipart/form-data')) {
      sendError(res, 'Content-Type debe ser multipart/form-data');
      return;
    }

    // Extraer el boundary
    const boundary = helpers.extractBoundary(contentType);
    if (!boundary) {
      sendError(res, 'Boundary no encontrado en Content-Type');
      return;
    }

    // Leer el cuerpo completo
    const chunks   = [];
    let totalSize  = 0;
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        req.pause();
        sendError(res, 'Archivo demasiado grande. Máximo 100MB', 413);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);

        // Parsear el multipart/form-data
        const parsed = helpers.parseMultipart(buffer, boundary);

        if (!parsed.files || parsed.files.length === 0) {
          sendError(res, 'No se encontraron archivos en la petición');
          return;
        }

        const targetPath = parsed.fields.path || '';

        logger.log('UPLOAD', `${parsed.files.length} archivo(s) a ${targetPath || '/'}`, ip);

        // Subir los archivos
        const results = [];
        for (const file of parsed.files) {
          const result = await fileService.uploadFile(file, targetPath);
          results.push(result);
        }

        sendSuccess(res, {
          message: `${results.length} archivo(s) subido(s) exitosamente`,
          files: results
        });

      } catch (error) {
        logger.log('ERROR', `Error procesando upload: ${error.message}`, ip);
        sendError(res, error.message, 500);
      }
    });

    req.on('error', (error) => {
      logger.log('ERROR', `Error en upload stream: ${error.message}`, ip);
      sendError(res, 'Error al recibir el archivo', 500);
    });

  } catch (error) {
    logger.log('ERROR', `Error en upload: ${error.message}`, req.socket.remoteAddress);
    sendError(res, error.message, 500);
  }
}

module.exports = {
  listFiles,
  renameFile,
  deleteFile,
  downloadFile,
  uploadFile
};