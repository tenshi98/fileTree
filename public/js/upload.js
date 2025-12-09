/*
*==================================================================
* upload.js
* Módulo para subida de archivos con barra de progreso
*
* Responsabilidades:
* - Manejar drag & drop de archivos
* - Mostrar barra de progreso en tiempo real
* - Usar XMLHttpRequest con upload.onprogress
* - Gestionar lista de archivos a subir
*/

const Upload = (() => {
  // Elementos del DOM
  let modal;
  let uploadZone;
  let fileInput;
  let selectFilesBtn;
  let uploadList;
  let progressContainer;
  let progressFill;
  let progressText;
  let confirmBtn;
  let cancelBtn;
  let closeBtn;
  let overlay;

  // Estado
  let selectedFiles = [];
  let currentPath = '';
  let onUploadCompleteCallback = null;

  /*
  *==================================================================
  * Inicializa el módulo de subida
  * @param {Function} onUploadComplete - Callback al completar subida
  */
  function init(onUploadComplete) {
    modal             = document.getElementById('uploadModal');
    uploadZone        = document.getElementById('uploadZone');
    fileInput         = document.getElementById('fileInput');
    selectFilesBtn    = document.getElementById('selectFilesBtn');
    uploadList        = document.getElementById('uploadList');
    progressContainer = document.getElementById('progressContainer');
    progressFill      = document.getElementById('progressFill');
    progressText      = document.getElementById('progressText');
    confirmBtn        = document.getElementById('confirmUploadBtn');
    cancelBtn         = document.getElementById('cancelUploadBtn');
    closeBtn          = document.getElementById('closeUpload');
    overlay           = modal.querySelector('.modal-overlay');

    onUploadCompleteCallback = onUploadComplete;

    // Event listeners
    setupEventListeners();
  }

  /*
  *==================================================================
  * Configura los event listeners
  */
  function setupEventListeners() {
    // Drag & Drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Click en zona de subida
    uploadZone.addEventListener('click', (e) => {
      if (e.target === uploadZone || e.target.classList.contains('upload-text') || e.target.closest('svg')) {
        fileInput.click();
      }
    });

    // Seleccionar archivos
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Botones del modal
    confirmBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
  }

  /*
  *==================================================================
  * Muestra el modal de subida
  * @param {string} path - Ruta de destino
  */
  function show(path = '') {
    currentPath   = path;
    selectedFiles = [];
    updateFileList();
    progressContainer.style.display = 'none';
    modal.classList.add('active');
  }

  /*
  *==================================================================
  * Cierra el modal
  */
  function close() {
    modal.classList.remove('active');
    selectedFiles   = [];
    fileInput.value = '';
    updateFileList();
  }

  /*
  *==================================================================
  * Maneja el evento dragover
  * @param {DragEvent} e - Evento
  */
  function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  }

  /*
  *==================================================================
  * Maneja el evento dragleave
  * @param {DragEvent} e - Evento
  */
  function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  }

  /*
  *==================================================================
  * Maneja el evento drop
  * @param {DragEvent} e - Evento
  */
  function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }

  /*
  *==================================================================
  * Maneja la selección de archivos
  * @param {Event} e - Evento
  */
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
  }

  /*
  *==================================================================
  * Agrega archivos a la lista
  * @param {Array<File>} files - Archivos a agregar
  */
  function addFiles(files) {
    files.forEach(file => {
      // Verificar si ya existe
      const exists = selectedFiles.some(f =>
        f.name === file.name && f.size === file.size
      );

      if (!exists) {
        selectedFiles.push(file);
      }
    });

    updateFileList();
  }

  /*
  *==================================================================
  * Actualiza la lista de archivos
  */
  function updateFileList() {
    uploadList.innerHTML = '';

    if (selectedFiles.length === 0) {
      confirmBtn.disabled = true;
      return;
    }

    confirmBtn.disabled = false;

    selectedFiles.forEach((file, index) => {
      const div = document.createElement('div');
      div.className = 'upload-item';
      div.innerHTML = `
        <span class="upload-item-name">${escapeHtml(file.name)}</span>
        <span class="upload-item-size">${formatFileSize(file.size)}</span>
        <button class="upload-item-remove" data-index="${index}">&times;</button>
      `;

      // Botón para remover archivo
      const removeBtn = div.querySelector('.upload-item-remove');
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        updateFileList();
      });

      uploadList.appendChild(div);
    });
  }

  /*
  *==================================================================
  * Maneja la subida de archivos
  */
  async function handleUpload() {
    if (selectedFiles.length === 0) return;

    // Deshabilitar botones
    confirmBtn.disabled = true;
    cancelBtn.disabled  = true;

    // Mostrar barra de progreso
    progressContainer.style.display = 'block';
    updateProgress(0);

    try {
      // Subir archivos con callback de progreso
      await API.uploadFiles(selectedFiles, currentPath, updateProgress);

      // Éxito
      updateProgress(100);
      showToast('Archivos subidos exitosamente', 'success');

      // Esperar un poco antes de cerrar
      setTimeout(() => {
        close();

        // Llamar al callback si existe
        if (onUploadCompleteCallback) {
          onUploadCompleteCallback();
        }
      }, 1000);

    } catch (error) {
      showToast('Error al subir archivos: ' + error.message, 'error');

      // Rehabilitar botones
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;

      // Ocultar barra de progreso después de un tiempo
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 3000);
    }
  }

  /*
  *==================================================================
  * Actualiza la barra de progreso
  * @param {number} percent - Porcentaje de progreso (0-100)
  */
  function updateProgress(percent) {
    const rounded            = Math.round(percent);
    progressFill.style.width = `${rounded}%`;
    progressText.textContent = `${rounded}%`;
  }

  /*
  *==================================================================
  * Muestra una notificación toast
  * @param {string} message - Mensaje
  * @param {string} type - Tipo (success, error, warning)
  */
  function showToast(message, type = 'success') {
    const toast       = document.getElementById('toast');
    toast.textContent = message;
    toast.className   = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i     = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
window.Upload = Upload;