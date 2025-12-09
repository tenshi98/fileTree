/*
*==================================================================
* fileService.js
* Servicios de lógica de negocio para operaciones de archivos
*
* Responsabilidades:
* - Implementar lógica de negocio
* - Interactuar con el sistema de archivos
* - Sanitizar y validar rutas
* - Ejecutar operaciones CRUD
*/

const fs      = require('fs').promises;
const fsSync  = require('fs');
const path    = require('path');
const helpers = require('./helpers');

// Directorio raíz donde se almacenan los archivos
const ROOT_DIR = path.join(__dirname, 'files');

/*
*==================================================================
* Resuelve una ruta relativa a una ruta absoluta segura
* @param {string} relativePath - Ruta relativa del usuario
* @returns {string} Ruta absoluta sanitizada
* @throws {Error} Si la ruta intenta escapar del directorio raíz
*/
function resolvePath(relativePath) {
  // Sanitizar la ruta para prevenir path traversal
  const sanitized = helpers.sanitizePath(relativePath);
  const absolute  = path.join(ROOT_DIR, sanitized);

  // Verificar que la ruta esté dentro del ROOT_DIR
  const normalized = path.normalize(absolute);
  if (!normalized.startsWith(ROOT_DIR)) {
    throw new Error('Acceso denegado: ruta fuera del directorio permitido');
  }

  return normalized;
}

/*
*==================================================================
* Lista archivos y carpetas de forma recursiva
* @param {string} relativePath - Ruta relativa a listar
* @returns {Promise<Object>} Árbol de archivos y carpetas
*/
async function listFiles(relativePath = '') {
  const absolutePath = resolvePath(relativePath);

  // Verificar que la ruta exista
  try {
    await fs.access(absolutePath);
  } catch (error) {
    throw new Error('Ruta no encontrada');
  }

  // Obtener información del archivo/carpeta
  const stats   = await fs.stat(absolutePath);
  const name    = path.basename(absolutePath) || 'files';
  const relPath = relativePath || '/';

  // Si es un archivo, retornar su información
  if (stats.isFile()) {
    return {
      name,
      path: relPath,
      type: 'file',
      size: stats.size,
      modified: stats.mtime,
      extension: path.extname(name)
    };
  }

  // Si es una carpeta, listar su contenido recursivamente
  const entries  = await fs.readdir(absolutePath);
  const children = [];

  for (const entry of entries) {
    const entryRelPath = path.join(relativePath, entry);
    const entryAbsPath = path.join(absolutePath, entry);

    try {
      const entryStats = await fs.stat(entryAbsPath);

      if (entryStats.isDirectory()) {
        // Es una carpeta - obtener solo info básica (no recursivo completo)
        children.push({
          name: entry,
          path: entryRelPath,
          type: 'directory',
          size: 0,
          modified: entryStats.mtime
        });
      } else {
        // Es un archivo
        children.push({
          name: entry,
          path: entryRelPath,
          type: 'file',
          size: entryStats.size,
          modified: entryStats.mtime,
          extension: path.extname(entry)
        });
      }
    } catch (error) {
      // Ignorar archivos que no se pueden leer (permisos, etc.)
      continue;
    }
  }

  // Ordenar: primero carpetas, luego archivos
  children.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });

  return {
    name,
    path: relPath,
    type: 'directory',
    size: stats.size,
    modified: stats.mtime,
    children
  };
}

/*
*==================================================================
* Renombra un archivo o carpeta
* @param {string} oldRelativePath - Ruta actual del archivo/carpeta
* @param {string} newName - Nuevo nombre
* @returns {Promise<Object>} Resultado de la operación
*/
async function renameFile(oldRelativePath, newName) {
  const oldAbsolutePath = resolvePath(oldRelativePath);

  // Verificar que el archivo/carpeta exista
  try {
    await fs.access(oldAbsolutePath);
  } catch (error) {
    throw new Error('Archivo o carpeta no encontrada');
  }

  // Validar el nuevo nombre
  if (!helpers.isValidFileName(newName)) {
    throw new Error('Nombre de archivo inválido');
  }

  // Construir la nueva ruta
  const directory       = path.dirname(oldAbsolutePath);
  const newAbsolutePath = path.join(directory, newName);

  // Verificar que no exista un archivo con el nuevo nombre
  if (fsSync.existsSync(newAbsolutePath)) {
    throw new Error('Ya existe un archivo o carpeta con ese nombre');
  }

  // Renombrar
  await fs.rename(oldAbsolutePath, newAbsolutePath);

  // Construir la nueva ruta relativa
  const oldDir          = path.dirname(oldRelativePath);
  const newRelativePath = path.join(oldDir, newName);

  return {
    message: 'Renombrado exitosamente',
    oldPath: oldRelativePath,
    newPath: newRelativePath,
    newName
  };
}

/*
*==================================================================
* Elimina un archivo o carpeta
* @param {string} relativePath - Ruta del archivo/carpeta a eliminar
* @returns {Promise<Object>} Resultado de la operación
*/
async function deleteFile(relativePath) {
  const absolutePath = resolvePath(relativePath);

  // Verificar que exista
  try {
    await fs.access(absolutePath);
  } catch (error) {
    throw new Error('Archivo o carpeta no encontrada');
  }

  // Obtener información
  const stats = await fs.stat(absolutePath);

  if (stats.isDirectory()) {
    // Eliminar carpeta recursivamente
    await fs.rm(absolutePath, { recursive: true, force: true });
  } else {
    // Eliminar archivo
    await fs.unlink(absolutePath);
  }

  return {
    message: 'Eliminado exitosamente',
    path: relativePath,
    type: stats.isDirectory() ? 'directory' : 'file'
  };
}

/*
*==================================================================
* Prepara un archivo para descarga
* @param {string} relativePath - Ruta del archivo
* @returns {Promise<Object>} Datos del archivo
*/
async function downloadFile(relativePath) {
  const absolutePath = resolvePath(relativePath);

  // Verificar que exista y sea un archivo
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error('La ruta no es un archivo');
    }
  } catch (error) {
    throw new Error('Archivo no encontrado');
  }

  // Leer el archivo
  const content  = await fs.readFile(absolutePath);
  const fileName = path.basename(absolutePath);
  const mimeType = helpers.getMimeType(fileName);

  return {
    content,
    fileName,
    mimeType
  };
}

/*
*==================================================================
* Sube un archivo al servidor
* @param {Object} file - Objeto con información del archivo
* @param {string} targetRelativePath - Ruta de destino (carpeta)
* @returns {Promise<Object>} Resultado de la operación
*/
async function uploadFile(file, targetRelativePath = '') {
  // Validar el nombre del archivo
  if (!helpers.isValidFileName(file.filename)) {
    throw new Error(`Nombre de archivo inválido: ${file.filename}`);
  }

  // Resolver la ruta de destino
  const targetDir = resolvePath(targetRelativePath);

  // Verificar que el directorio de destino exista
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      throw new Error('El destino no es una carpeta');
    }
  } catch (error) {
    throw new Error('Carpeta de destino no encontrada');
  }

  // Construir la ruta completa del archivo
  const filePath = path.join(targetDir, file.filename);

  // Verificar si ya existe un archivo con ese nombre
  if (fsSync.existsSync(filePath)) {
    // Agregar timestamp para evitar sobrescribir
    const ext            = path.extname(file.filename);
    const nameWithoutExt = path.basename(file.filename, ext);
    const timestamp      = Date.now();
    const newFilename    = `${nameWithoutExt}_${timestamp}${ext}`;
    const newFilePath    = path.join(targetDir, newFilename);

    await fs.writeFile(newFilePath, file.content);

    return {
      message: 'Archivo subido (renombrado para evitar duplicados)',
      filename: newFilename,
      path: path.join(targetRelativePath, newFilename),
      size: file.content.length
    };
  }

  // Escribir el archivo
  await fs.writeFile(filePath, file.content);

  return {
    message: 'Archivo subido exitosamente',
    filename: file.filename,
    path: path.join(targetRelativePath, file.filename),
    size: file.content.length
  };
}

/*
*==================================================================
* Crea una nueva carpeta
* @param {string} relativePath - Ruta donde crear la carpeta
* @param {string} folderName - Nombre de la carpeta
* @returns {Promise<Object>} Resultado de la operación
*/
async function createFolder(relativePath, folderName) {
  const parentDir     = resolvePath(relativePath);
  const newFolderPath = path.join(parentDir, folderName);

  // Validar nombre
  if (!helpers.isValidFileName(folderName)) {
    throw new Error('Nombre de carpeta inválido');
  }

  // Verificar que no exista
  if (fsSync.existsSync(newFolderPath)) {
    throw new Error('Ya existe una carpeta con ese nombre');
  }

  // Crear carpeta
  await fs.mkdir(newFolderPath);

  return {
    message: 'Carpeta creada exitosamente',
    path: path.join(relativePath, folderName),
    name: folderName
  };
}

module.exports = {
  listFiles,
  renameFile,
  deleteFile,
  downloadFile,
  uploadFile,
  createFolder
};