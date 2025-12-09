/*
*==================================================================
* tree.js
* Módulo para construcción y manejo del árbol de archivos
*
* Responsabilidades:
* - Renderizar la estructura de carpetas
* - Manejar expansión/colapso de carpetas
* - Crear nodos dinámicamente
* - Aplicar estilos según tipo de archivo
*/

const Tree = (() => {
  // Elementos del DOM
  let treeContainer;
  let currentSelectedPath    = null;
  let onFolderSelectCallback = null;
  let onFileSelectCallback   = null;

  /*
  *==================================================================
  * Inicializa el módulo del árbol
  * @param {HTMLElement} container - Contenedor del árbol
  * @param {Function} onFolderSelect - Callback al seleccionar carpeta
  * @param {Function} onFileSelect - Callback al seleccionar archivo
  */
  function init(container, onFolderSelect, onFileSelect) {
    treeContainer          = container;
    onFolderSelectCallback = onFolderSelect;
    onFileSelectCallback   = onFileSelect;
  }

  /*
  *==================================================================
  * Crea un ícono SVG para carpeta
  * @returns {string} HTML del ícono
  */
  function getFolderIcon() {
    return `
      <svg class="tree-icon folder" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    `;
  }

  /*
  *==================================================================
  * Crea un ícono SVG para archivo
  * @returns {string} HTML del ícono
  */
  function getFileIcon() {
    return `
      <svg class="tree-icon file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
    `;
  }

  /*
  *==================================================================
  * Crea un ícono SVG para toggle (flecha)
  * @returns {string} HTML del ícono
  */
  function getToggleIcon() {
    return `
      <svg class="tree-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    `;
  }

  /*
  *==================================================================
  * Renderiza el árbol de archivos
  * @param {Object} data - Datos del árbol
  * @param {HTMLElement} container - Contenedor donde renderizar (opcional)
  * @param {number} level - Nivel de profundidad (interno)
  */
  function render(data, container = treeContainer, level = 0) {
    if (!container) return;

    // Limpiar el contenedor solo en el nivel raíz
    if (level === 0) {
      container.innerHTML = '';
    }

    // Si no hay datos, mostrar mensaje
    if (!data) {
      container.innerHTML = '<div class="empty-state"><p>No hay datos para mostrar</p></div>';
      return;
    }

    // Si es un archivo individual
    if (data.type === 'file') {
      const fileNode = createFileNode(data, level);
      container.appendChild(fileNode);
      return;
    }

    // Si es una carpeta
    if (data.type === 'directory') {
      // Si es el nivel raíz, no crear nodo para la carpeta raíz
      if (level === 0) {
        // Renderizar directamente los hijos
        if (data.children && data.children.length > 0) {
          data.children.forEach(child => {
            if (child.type === 'directory') {
              const folderNode = createFolderNode(child, level);
              container.appendChild(folderNode);
            } else {
              const fileNode = createFileNode(child, level);
              container.appendChild(fileNode);
            }
          });
        } else {
          container.innerHTML = '<div class="empty-state"><p>Carpeta vacía</p></div>';
        }
      } else {
        // Crear nodo para la carpeta
        const folderNode = createFolderNode(data, level);
        container.appendChild(folderNode);
      }
    }
  }

  /*
  *==================================================================
  * Crea un nodo de carpeta
  * @param {Object} data - Datos de la carpeta
  * @param {number} level - Nivel de profundidad
  * @returns {HTMLElement} Elemento DOM del nodo
  */
  function createFolderNode(data, level) {
    const div        = document.createElement('div');
    div.className    = 'tree-node';
    div.dataset.path = data.path;
    div.dataset.type = 'directory';

    // Crear el elemento principal de la carpeta
    const itemDiv     = document.createElement('div');
    itemDiv.className = 'tree-item folder';
    itemDiv.innerHTML = `
      ${getToggleIcon()}
      ${getFolderIcon()}
      <span class="tree-name">${escapeHtml(data.name)}</span>
    `;

    // Crear contenedor para los hijos (inicialmente vacío)
    const childrenDiv         = document.createElement('div');
    childrenDiv.className     = 'tree-children';
    childrenDiv.style.display = 'none';

    div.appendChild(itemDiv);
    div.appendChild(childrenDiv);

    // Toggle para expandir/colapsar
    const toggle = itemDiv.querySelector('.tree-toggle');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFolder(itemDiv, childrenDiv, data);
    });

    // Click en la carpeta para seleccionarla
    itemDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(itemDiv, data.path);
      if (onFolderSelectCallback) {
        onFolderSelectCallback(data);
      }
    });

    return div;
  }

  /*
  *==================================================================
  * Crea un nodo de archivo
  * @param {Object} data - Datos del archivo
  * @param {number} level - Nivel de profundidad
  * @returns {HTMLElement} Elemento DOM del nodo
  */
  function createFileNode(data, level) {
    const div        = document.createElement('div');
    div.className    = 'tree-node';
    div.dataset.path = data.path;
    div.dataset.type = 'file';

    const itemDiv     = document.createElement('div');
    itemDiv.className = 'tree-item file';
    itemDiv.innerHTML = `
      ${getFileIcon()}
      <span class="tree-name">${escapeHtml(data.name)}</span>
    `;

    // Click en el archivo
    itemDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(itemDiv, data.path);
      if (onFileSelectCallback) {
        onFileSelectCallback(data);
      }
    });

    div.appendChild(itemDiv);
    return div;
  }

  /*
  *==================================================================
  * Expande o colapsa una carpeta
  * @param {HTMLElement} itemDiv - Elemento del item
  * @param {HTMLElement} childrenDiv - Contenedor de hijos
  * @param {Object} data - Datos de la carpeta
  */
  async function toggleFolder(itemDiv, childrenDiv, data) {
    const toggle     = itemDiv.querySelector('.tree-toggle');
    const isExpanded = toggle.classList.contains('expanded');

    if (isExpanded) {
      // Colapsar
      toggle.classList.remove('expanded');
      childrenDiv.style.display = 'none';
    } else {
      // Expandir
      toggle.classList.add('expanded');
      childrenDiv.style.display = 'block';

      // Si no tiene hijos cargados, cargarlos
      if (childrenDiv.children.length === 0) {
        try {
          childrenDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

          // Cargar el contenido de la carpeta
          const folderData = await API.listFiles(data.path);

          childrenDiv.innerHTML = '';

          if (folderData.children && folderData.children.length > 0) {
            folderData.children.forEach(child => {
              if (child.type === 'directory') {
                const folderNode = createFolderNode(child, 0);
                childrenDiv.appendChild(folderNode);
              } else {
                const fileNode = createFileNode(child, 0);
                childrenDiv.appendChild(fileNode);
              }
            });
          } else {
            childrenDiv.innerHTML = '<div class="empty-state" style="padding: 10px;"><p>Carpeta vacía</p></div>';
          }
        } catch (error) {
          childrenDiv.innerHTML = `<div class="empty-state" style="padding: 10px; color: red;"><p>Error: ${error.message}</p></div>`;
        }
      }
    }
  }

  /*
  *==================================================================
  * Selecciona un item en el árbol
  * @param {HTMLElement} itemDiv - Elemento a seleccionar
  * @param {string} path - Ruta del elemento
  */
  function selectItem(itemDiv, path) {
    // Remover selección anterior
    const previousSelected = treeContainer.querySelector('.tree-item.active');
    if (previousSelected) {
      previousSelected.classList.remove('active');
    }

    // Agregar selección nueva
    itemDiv.classList.add('active');
    currentSelectedPath = path;
  }

  /*
  *==================================================================
  * Obtiene la ruta del elemento seleccionado
  * @returns {string|null} Ruta seleccionada
  */
  function getSelectedPath() {
    return currentSelectedPath;
  }

  /*
  *==================================================================
  * Limpia el árbol
  */
  function clear() {
    if (treeContainer) {
      treeContainer.innerHTML = '';
    }
    currentSelectedPath = null;
  }

  /*
  *==================================================================
  * Muestra un estado de carga
  */
  function showLoading() {
    if (treeContainer) {
      treeContainer.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando archivos...</p>
        </div>
      `;
    }
  }

  /*
  *==================================================================
  * Muestra un mensaje de error
  * @param {string} message - Mensaje de error
  */
  function showError(message) {
    if (treeContainer) {
      treeContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>${escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  /*
  *==================================================================
  * Escapa caracteres HTML
  * @param {string} text - Texto a escapar
  * @returns {string} Texto escapado
  */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // API pública del módulo
  return {
    init,
    render,
    clear,
    showLoading,
    showError,
    getSelectedPath
  };
})();

// Hacer disponible globalmente
window.Tree = Tree;