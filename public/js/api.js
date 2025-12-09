/*
*==================================================================
* api.js
* Cliente para comunicación con el backend
*
* Responsabilidades:
* - Encapsular todas las llamadas a la API
* - Manejar errores de red
* - Retornar promesas
* - Parsear respuestas JSON
*/

const API = (() => {
  // URL base de la API
  const BASE_URL = '/api';

  /*
  *==================================================================
  * Realiza una petición HTTP
  * @param {string} endpoint - Endpoint de la API
  * @param {Object} options - Opciones de la petición (método, body, etc.)
  * @returns {Promise<Object>} Respuesta parseada
  */
  async function request(endpoint, options = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;

      const config = {
        method: options.method || 'GET',
        headers: options.headers || {},
        ...options
      };

      // Si hay body y no es FormData, convertir a JSON
      if (options.body && !(options.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
        config.body                    = JSON.stringify(options.body);
      }

      const response = await fetch(url, config);

      // Si la respuesta es un blob (archivo), retornarlo directamente
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.blob();
      }

      // Parsear JSON
      const data = await response.json();

      // Si la respuesta no es exitosa, lanzar error con el mensaje del servidor
      if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`);
      }

      return data;

    } catch (error) {
      // Manejar errores de red
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
      }
      throw error;
    }
  }

  /*
  *==================================================================
  * Lista archivos y carpetas
  * @param {string} path - Ruta relativa (opcional)
  * @returns {Promise<Object>} Árbol de archivos
  */
  async function listFiles(path = '') {
    const endpoint = path ? `/files?path=${encodeURIComponent(path)}` : '/files';
    const response = await request(endpoint);
    return response.data;
  }

  /*
  *==================================================================
  * Renombra un archivo o carpeta
  * @param {string} oldPath - Ruta actual
  * @param {string} newName - Nuevo nombre
  * @returns {Promise<Object>} Resultado de la operación
  */
  async function renameFile(oldPath, newName) {
    const response = await request('/rename', {
      method: 'POST',
      body: { oldPath, newName }
    });
    return response.data;
  }

  /*
  *==================================================================
  * Elimina un archivo o carpeta
  * @param {string} path - Ruta del archivo/carpeta
  * @returns {Promise<Object>} Resultado de la operación
  */
  async function deleteFile(path) {
    const response = await request(`/delete?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
    return response.data;
  }

  /*
  *==================================================================
  * Descarga un archivo
  * @param {string} path - Ruta del archivo
  * @param {string} filename - Nombre del archivo para guardar
  */
  async function downloadFile(path, filename) {
    try {
      const blob = await request(`/download?path=${encodeURIComponent(path)}`, {
        responseType: 'blob'
      });

      // Crear un enlace temporal para descargar el archivo
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Descarga iniciada' };
    } catch (error) {
      throw error;
    }
  }

  /*
  *==================================================================
  * Sube archivos al servidor
  * @param {FileList|Array} files - Archivos a subir
  * @param {string} targetPath - Ruta de destino
  * @param {Function} onProgress - Callback de progreso (opcional)
  * @returns {Promise<Object>} Resultado de la operación
  */
  function uploadFiles(files, targetPath = '', onProgress = null) {
    return new Promise((resolve, reject) => {
      // Crear FormData
      const formData = new FormData();

      // Agregar archivos
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      // Agregar ruta de destino
      formData.append('path', targetPath);

      // Crear XMLHttpRequest (para poder usar onprogress)
      const xhr = new XMLHttpRequest();

      // Configurar evento de progreso
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      // Configurar evento de carga completa
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || 'Error al subir archivos'));
            }
          } catch (error) {
            reject(new Error('Error al parsear la respuesta del servidor'));
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            reject(new Error(response.error || `Error HTTP: ${xhr.status}`));
          } catch (error) {
            reject(new Error(`Error HTTP: ${xhr.status}`));
          }
        }
      });

      // Configurar evento de error
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir archivos'));
      });

      // Configurar evento de cancelación
      xhr.addEventListener('abort', () => {
        reject(new Error('Subida cancelada'));
      });

      // Enviar la petición
      xhr.open('POST', `${BASE_URL}/upload`);
      xhr.send(formData);
    });
  }

  /*
  *==================================================================
  * Verifica el estado del servidor
  * @returns {Promise<Object>} Estado del servidor
  */
  async function healthCheck() {
    try {
      const response = await request('/health');
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // API pública del módulo
  return {
    listFiles,
    renameFile,
    deleteFile,
    downloadFile,
    uploadFiles,
    healthCheck
  };
})();

// Hacer disponible globalmente
window.API = API;