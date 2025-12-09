/*
*==================================================================
* preview.js
* Módulo para vista previa de archivos
*
* Responsabilidades:
* - Mostrar modal con vista previa de imágenes
* - Mostrar información de archivo
* - Manejar diferentes tipos de archivo
* - Cerrar modal con ESC o click
*/

const Preview = (() => {
  // Elementos del DOM
  let modal;
  let previewTitle;
  let previewBody;
  let closeBtn;
  let closeModalBtn;
  let overlay;

  /*
  *==================================================================
  * Inicializa el módulo de vista previa
  */
  function init() {
    modal         = document.getElementById('previewModal');
    previewTitle  = document.getElementById('previewTitle');
    previewBody   = document.getElementById('previewBody');
    closeBtn      = document.getElementById('closePreview');
    closeModalBtn = document.getElementById('closePreviewBtn');
    overlay       = modal.querySelector('.modal-overlay');

    // Event listeners para cerrar el modal
    closeBtn.addEventListener('click', close);
    closeModalBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        close();
      }
    });
  }

  /*
  *==================================================================
  * Muestra la vista previa de un archivo
  * @param {Object} fileData - Datos del archivo
  */
  async function show(fileData) {
    if (!fileData || fileData.type !== 'file') {
      showError('No se puede mostrar vista previa de carpetas');
      return;
    }

    // Actualizar título
    previewTitle.textContent = fileData.name;

    // Limpiar contenido anterior
    previewBody.innerHTML = '';

    // Verificar si es una imagen
    if (isImage(fileData.extension)) {
      showImagePreview(fileData);
    } else {
      showFileInfo(fileData);
    }

    // Mostrar el modal
    modal.classList.add('active');
  }

  /*
  *==================================================================
  * Muestra la vista previa de una imagen
  * @param {Object} fileData - Datos del archivo de imagen
  */
  function showImagePreview(fileData) {
    const imageUrl = `/api/download?path=${encodeURIComponent(fileData.path)}`;

    previewBody.innerHTML = `
      <div style="text-align: center;">
        <img
          src="${imageUrl}"
          alt="${escapeHtml(fileData.name)}"
          class="preview-image"
          onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%2250%22 font-size=%2218%22 fill=%22%23999%22>Error al cargar imagen</text></svg>';"
        >
      </div>
      ${generateFileInfoHtml(fileData)}
    `;
  }

  /*
  *==================================================================
  * Muestra información de un archivo (no imagen)
  * @param {Object} fileData - Datos del archivo
  */
  function showFileInfo(fileData) {
    previewBody.innerHTML = `
      <div style="text-align: center; padding: 40px 0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 80px; height: 80px; color: #999; margin-bottom: 20px;">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        <p style="color: #999; margin-bottom: 30px;">No hay vista previa disponible para este tipo de archivo</p>
      </div>
      ${generateFileInfoHtml(fileData)}
    `;
  }

  /*
  *==================================================================
  * Genera el HTML con información del archivo
  * @param {Object} fileData - Datos del archivo
  * @returns {string} HTML con la información
  */
  function generateFileInfoHtml(fileData) {
    const size     = formatFileSize(fileData.size);
    const modified = formatDate(fileData.modified);
    const type     = getFileType(fileData.extension);

    return `
      <div class="preview-info">
        <div class="preview-info-row">
          <span class="preview-info-label">Nombre:</span>
          <span class="preview-info-value">${escapeHtml(fileData.name)}</span>
        </div>
        <div class="preview-info-row">
          <span class="preview-info-label">Tamaño:</span>
          <span class="preview-info-value">${size}</span>
        </div>
        <div class="preview-info-row">
          <span class="preview-info-label">Tipo:</span>
          <span class="preview-info-value">${type}</span>
        </div>
        <div class="preview-info-row">
          <span class="preview-info-label">Modificado:</span>
          <span class="preview-info-value">${modified}</span>
        </div>
        <div class="preview-info-row">
          <span class="preview-info-label">Ruta:</span>
          <span class="preview-info-value">${escapeHtml(fileData.path)}</span>
        </div>
      </div>
    `;
  }

  /*
  *==================================================================
  * Cierra el modal
  */
  function close() {
    modal.classList.remove('active');
    previewBody.innerHTML = '';
  }

  /*
  *==================================================================
  * Muestra un mensaje de error
  * @param {string} message - Mensaje de error
  */
  function showError(message) {
    previewTitle.textContent = 'Error';
    previewBody.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #dc3545;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 60px; height: 60px; margin-bottom: 20px;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    modal.classList.add('active');
  }

  /*
  *==================================================================
  * Verifica si un archivo es una imagen
  * @param {string} extension - Extensión del archivo
  * @returns {boolean} True si es una imagen
  */
  function isImage(extension) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.includes(extension.toLowerCase());
  }

  /*
  *==================================================================
  * Obtiene el tipo de archivo legible
  * @param {string} extension - Extensión del archivo
  * @returns {string} Tipo de archivo
  */
  function getFileType(extension) {
    const types = {
      // Imágenes
      '.jpg': 'Imagen JPEG',
      '.jpeg': 'Imagen JPEG',
      '.png': 'Imagen PNG',
      '.gif': 'Imagen GIF',
      '.bmp': 'Imagen BMP',
      '.webp': 'Imagen WebP',
      '.svg': 'Imagen SVG',
      '.ico': 'Ícono',

      // Documentos
      '.pdf': 'Documento PDF',
      '.doc': 'Documento Word',
      '.docx': 'Documento Word',
      '.xls': 'Hoja de cálculo Excel',
      '.xlsx': 'Hoja de cálculo Excel',
      '.ppt': 'Presentación PowerPoint',
      '.pptx': 'Presentación PowerPoint',
      '.txt': 'Archivo de texto',

      // Código
      '.html': 'Documento HTML',
      '.css': 'Hoja de estilos CSS',
      '.js': 'JavaScript',
      '.json': 'JSON',
      '.xml': 'XML',

      // Comprimidos
      '.zip': 'Archivo ZIP',
      '.rar': 'Archivo RAR',
      '.7z': 'Archivo 7-Zip',
      '.tar': 'Archivo TAR',
      '.gz': 'Archivo GZIP',

      // Audio
      '.mp3': 'Audio MP3',
      '.wav': 'Audio WAV',
      '.ogg': 'Audio OGG',

      // Video
      '.mp4': 'Video MP4',
      '.avi': 'Video AVI',
      '.mov': 'Video MOV',
      '.wmv': 'Video WMV'
    };

    return types[extension.toLowerCase()] || `Archivo ${extension.toUpperCase()}`;
  }

  /*
  *==================================================================
  * Formatea el tamaño del archivo
  * @param {number} bytes - Tamaño en bytes
  * @returns {string} Tamaño formateado
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
  * Formatea una fecha
  * @param {string} dateString - Fecha en formato ISO
  * @returns {string} Fecha formateada
  */
  function formatDate(dateString) {
    const date    = new Date(dateString);
    const day     = String(date.getDate()).padStart(2, '0');
    const month   = String(date.getMonth() + 1).padStart(2, '0');
    const year    = date.getFullYear();
    const hours   = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /*
  *==================================================================
  * Escapa caracteres HTML
  * @param {string} text - Texto a escapar
  * @returns {string} Texto escapado
  */
  function escapeHtml(text) {
    const div       = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // API pública del módulo
  return {
    init,
    show,
    close
  };
})();

// Hacer disponible globalmente
window.Preview = Preview;