/*
*==================================================================
* app.js
* Controlador principal de la aplicación
*
* Responsabilidades:
* - Inicializar la aplicación
* - Coordinar los módulos
* - Manejar eventos del DOM
* - Gestionar el estado de la UI
*/

const App = (() => {
  // Elementos del DOM
  let fileTree;
  let fileList;
  let currentPathElement;
  let fileCountElement;
  let breadcrumb;
  let refreshBtn;
  let uploadBtn;
  let renameModal;
  let newFileNameInput;
  let confirmRenameBtn;
  let cancelRenameBtn;
  let closeRenameBtn;

  // Estado de la aplicación
  let currentFolderData = null;
  let selectedFile      = null;
  let fileToRename      = null;

  /*
  *==================================================================
  * Inicializa la aplicación
  */
  async function init() {
    console.log('🚀 Iniciando Explorador de Archivos...');

    // Obtener elementos del DOM
    getElements();

    // Inicializar módulos
    initModules();

    // Configurar event listeners
    setupEventListeners();

    // Cargar datos iniciales
    await loadInitialData();

    console.log('✅ Aplicación inicializada');
  }

  /*
  *==================================================================
  * Obtiene referencias a elementos del DOM
  */
  function getElements() {
    fileTree           = document.getElementById('fileTree');
    fileList           = document.getElementById('fileList');
    currentPathElement = document.getElementById('currentPath');
    fileCountElement   = document.getElementById('fileCount');
    breadcrumb         = document.getElementById('breadcrumb');
    refreshBtn         = document.getElementById('refreshBtn');
    uploadBtn          = document.getElementById('uploadBtn');

    // Modal de renombrar
    renameModal      = document.getElementById('renameModal');
    newFileNameInput = document.getElementById('newFileName');
    confirmRenameBtn = document.getElementById('confirmRenameBtn');
    cancelRenameBtn  = document.getElementById('cancelRenameBtn');
    closeRenameBtn   = document.getElementById('closeRename');
  }

  /*
  *==================================================================
  * Inicializa los módulos
  */
  function initModules() {
    // Inicializar el árbol de archivos
    Tree.init(fileTree, handleFolderSelect, handleFileSelect);

    // Inicializar vista previa
    Preview.init();

    // Inicializar módulo de subida
    Upload.init(handleUploadComplete);
  }

  /*
  *==================================================================
  * Configura event listeners
  */
  function setupEventListeners() {
    // Botón de actualizar
    refreshBtn.addEventListener('click', refresh);

    // Botón de subir archivos
    uploadBtn.addEventListener('click', () => {
      const path = currentFolderData ? currentFolderData.path : '';
      Upload.show(path);
    });

    // Modal de renombrar
    confirmRenameBtn.addEventListener('click', handleRename);
    cancelRenameBtn.addEventListener('click', closeRenameModal);
    closeRenameBtn.addEventListener('click', closeRenameModal);
    renameModal.querySelector('.modal-overlay').addEventListener('click', closeRenameModal);

    // Enter en input de renombrar
    newFileNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleRename();
      }
    });
  }

  /*
  *==================================================================
  * Carga los datos iniciales
  */
  async function loadInitialData() {
    try {
      Tree.showLoading();
      const data = await API.listFiles();
      Tree.render(data);
    } catch (error) {
      Tree.showError('Error al cargar archivos: ' + error.message);
      showToast('Error al cargar archivos: ' + error.message, 'error');
    }
  }

  /*
  *==================================================================
  * Refresca la vista actual
  */
  async function refresh() {
    console.log('🔄 Refrescando...');
    await loadInitialData();

    // Si hay una carpeta seleccionada, recargarla
    if (currentFolderData) {
      await handleFolderSelect(currentFolderData);
    }

    showToast('Vista actualizada', 'success');
  }

  /*
  *==================================================================
  * Maneja la selección de una carpeta
  * @param {Object} folderData - Datos de la carpeta
  */
  async function handleFolderSelect(folderData) {
    try {
      currentFolderData = folderData;

      // Actualizar path actual
      currentPathElement.textContent = folderData.name;

      // Actualizar breadcrumb
      updateBreadcrumb(folderData.path);

      // Mostrar loading
      fileList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

      // Cargar contenido de la carpeta
      const data = await API.listFiles(folderData.path);

      // Renderizar lista de archivos
      renderFileList(data);

    } catch (error) {
      fileList.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(error.message)}</p></div>`;
      showToast('Error al cargar carpeta: ' + error.message, 'error');
    }
  }

  /*
  *==================================================================
  * Maneja la selección de un archivo
  * @param {Object} fileData - Datos del archivo
  */
  function handleFileSelect(fileData) {
    selectedFile = fileData;
    // Mostrar vista previa
    Preview.show(fileData);
  }

  /*
  *==================================================================
  * Renderiza la lista de archivos
  * @param {Object} data - Datos de la carpeta
  */
  function renderFileList(data) {
    fileList.innerHTML = '';

    if (!data.children || data.children.length === 0) {
      fileList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>Esta carpeta está vacía</p>
        </div>
      `;
      fileCountElement.textContent = '0 elementos';
      return;
    }

    // Actualizar contador
    fileCountElement.textContent = `${data.children.length} elemento${data.children.length !== 1 ? 's' : ''}`;

    // Renderizar cada elemento
    data.children.forEach(item => {
      const fileItem = createFileItem(item);
      fileList.appendChild(fileItem);
    });
  }

  /*
  *==================================================================
  * Crea un elemento de archivo/carpeta para la lista
  * @param {Object} item - Datos del elemento
  * @returns {HTMLElement} Elemento DOM
  */
  function createFileItem(item) {
    const div     = document.createElement('div');
    div.className = 'file-item';

    const isFolder = item.type === 'directory';
    const icon     = isFolder ? getFolderIconHtml() : getFileIconHtml();
    const size     = isFolder ? '' : formatFileSize(item.size);
    const date     = formatDate(item.modified);

    div.innerHTML = `
      <div class="file-item-info">
        <div class="file-item-icon ${isFolder ? 'folder' : 'file'}">
          ${icon}
        </div>
        <div class="file-item-details">
          <div class="file-item-name">${escapeHtml(item.name)}</div>
          <div class="file-item-meta">${size ? size + ' • ' : ''}${date}</div>
        </div>
      </div>
      <div class="file-item-actions">
        ${!isFolder ? '<button class="pure-button button-small button-secondary preview-btn">Vista Previa</button>' : ''}
        <button class="pure-button button-small button-secondary rename-btn">Renombrar</button>
        <button class="pure-button button-small button-secondary download-btn">Descargar</button>
        <button class="pure-button button-small button-danger delete-btn">Eliminar</button>
      </div>
    `;

    // Click en el elemento (abrir carpeta o vista previa)
    div.addEventListener('click', (e) => {
      // Si se hizo click en un botón, no hacer nada
      if (e.target.classList.contains('pure-button')) return;

      if (isFolder) {
        handleFolderSelect(item);
      } else {
        Preview.show(item);
      }
    });

    // Botón de vista previa
    const previewBtn = div.querySelector('.preview-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Preview.show(item);
      });
    }

    // Botón de renombrar
    const renameBtn = div.querySelector('.rename-btn');
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameModal(item);
    });

    // Botón de descargar
    const downloadBtn = div.querySelector('.download-btn');
    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleDownload(item);
    });

    // Botón de eliminar
    const deleteBtn = div.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(item);
    });

    return div;
  }

  /*
  *==================================================================
  * Muestra el modal de renombrar
  * @param {Object} item - Elemento a renombrar
  */
  function showRenameModal(item) {
    fileToRename           = item;
    newFileNameInput.value = item.name;
    renameModal.classList.add('active');
    newFileNameInput.focus();
    newFileNameInput.select();
  }

  /*
  *==================================================================
  * Cierra el modal de renombrar
  */
  function closeRenameModal() {
    renameModal.classList.remove('active');
    fileToRename           = null;
    newFileNameInput.value = '';
  }

  /*
  *==================================================================
  * Maneja el renombrado de archivos
  */
  async function handleRename() {
    if (!fileToRename) return;

    const newName = newFileNameInput.value.trim();

    if (!newName) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    if (newName === fileToRename.name) {
      closeRenameModal();
      return;
    }

    try {
      confirmRenameBtn.disabled    = true;
      confirmRenameBtn.textContent = 'Renombrando...';

      await API.renameFile(fileToRename.path, newName);

      showToast('Renombrado exitosamente', 'success');
      closeRenameModal();

      // Refrescar la vista
      if (currentFolderData) {
        await handleFolderSelect(currentFolderData);
      }
      await loadInitialData();

    } catch (error) {
      showToast('Error al renombrar: ' + error.message, 'error');
    } finally {
      confirmRenameBtn.disabled = false;
      confirmRenameBtn.textContent = 'Renombrar';
    }
  }

  /*
  *==================================================================
  * Maneja la descarga de archivos
  * @param {Object} item - Elemento a descargar
  */
  async function handleDownload(item) {
    try {
      showToast('Descargando...', 'success');
      await API.downloadFile(item.path, item.name);
      showToast('Descarga completada', 'success');
    } catch (error) {
      showToast('Error al descargar: ' + error.message, 'error');
    }
  }

  /*
  *==================================================================
  * Maneja la eliminación de archivos
  * @param {Object} item - Elemento a eliminar
  */
  async function handleDelete(item) {
    const confirmMsg = item.type === 'directory'
      ? `¿Estás seguro de eliminar la carpeta "${item.name}" y todo su contenido?`
      : `¿Estás seguro de eliminar el archivo "${item.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await API.deleteFile(item.path);
      showToast('Eliminado exitosamente', 'success');

      // Refrescar la vista
      if (currentFolderData) {
        await handleFolderSelect(currentFolderData);
      }
      await loadInitialData();

    } catch (error) {
      showToast('Error al eliminar: ' + error.message, 'error');
    }
  }

  /*
  *==================================================================
  * Maneja la finalización de subida de archivos
  */
  async function handleUploadComplete() {
    // Refrescar la vista
    if (currentFolderData) {
      await handleFolderSelect(currentFolderData);
    }
    await loadInitialData();
  }

  /*
  *==================================================================
  * Actualiza el breadcrumb
  * @param {string} path - Ruta actual
  */
  function updateBreadcrumb(path) {
    breadcrumb.innerHTML = '';

    if (!path || path === '/') {
      breadcrumb.innerHTML = '<span class="breadcrumb-item active">files</span>';
      return;
    }

    const parts = path.split('/').filter(p => p);

    // Agregar raíz
    const rootSpan       = document.createElement('span');
    rootSpan.className   = 'breadcrumb-item';
    rootSpan.textContent = 'files';
    rootSpan.addEventListener('click', () => loadInitialData());
    breadcrumb.appendChild(rootSpan);

    // Agregar cada parte
    parts.forEach((part, index) => {
      const span       = document.createElement('span');
      span.className   = index === parts.length - 1 ? 'breadcrumb-item active' : 'breadcrumb-item';
      span.textContent = part;

      if (index < parts.length - 1) {
        span.addEventListener('click', async () => {
          const partPath = parts.slice(0, index + 1).join('/');
          const data     = await API.listFiles(partPath);
          await handleFolderSelect(data);
        });
      }

      breadcrumb.appendChild(span);
    });
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
  * Obtiene HTML para ícono de carpeta
  */
  function getFolderIconHtml() {
    return `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    `;
  }

  /*
  *==================================================================
  * Obtiene HTML para ícono de archivo
  */
  function getFileIconHtml() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
    `;
  }

  /*
  *==================================================================
  * Formatea el tamaño del archivo
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
  * Formatea una fecha
  */
  function formatDate(dateString) {
    const date  = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /*
  *==================================================================
  * Escapa HTML
  */
  function escapeHtml(text) {
    const div       = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // API pública
  return {
    init
  };
})();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}