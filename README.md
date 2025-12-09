# 🗂️ Explorador de Archivos Web

Sistema completo de explorador de archivos en el navegador, implementado con JavaScript puro (Vanilla JS) sin frameworks.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Cómo Ejecutar el Proyecto](#-cómo-ejecutar-el-proyecto)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Módulos del Backend](#-módulos-del-backend)
- [Módulos del Frontend](#-módulos-del-frontend)
- [Buenas prácticas y seguridad](#-buenas-prácticas-y-seguridad)
- [Solución de Problemas](#-solución-de-problemas)
- [Notas Adicionales](#-notas-adicionales)

## 📋 Características

### Backend
- ✅ Node.js puro sin frameworks externos
- ✅ Listado recursivo de archivos y carpetas
- ✅ Renombrar archivos y carpetas
- ✅ Descargar archivos
- ✅ Eliminar archivos y carpetas
- ✅ Subir archivos con manejo de multipart/form-data
- ✅ Sistema de logs detallado
- ✅ Sanitización de rutas (protección contra path traversal)
- ✅ Rate limiting
- ✅ Manejo robusto de errores
- ✅ Código modular y bien documentado

### Frontend
- ✅ Interfaz estilo explorador con Pure CSS
- ✅ Vista en árbol expandible/colapsable
- ✅ Vista previa de imágenes en modal
- ✅ Barra de progreso para subida de archivos
- ✅ Acciones inline (renombrar, eliminar, descargar)
- ✅ Iconos diferenciados para carpetas y archivos
- ✅ Carga dinámica de contenido
- ✅ JavaScript puro modular

## 🔧 Requisitos

- Node.js >= 14.0.0
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 📦 Instalación

### 1. Crear la estructura del proyecto

```bash
git clone https://github.com/tenshi98/fileTree.git
cd fileTree
```

### 2. Crear estructura de carpetas

```bash
# Backend
mkdir -p server/logs
mkdir -p server/files
```

### 3. Inicializar proyecto Node.js

```bash
npm init -y
```

### 4. Configurar package.json

Agregar los siguientes scripts:

```json
{
  "name": "file-explorer",
  "version": "1.0.0",
  "description": "Explorador de archivos web con JavaScript puro (Vanilla JS)",
  "main": "server/server.js",
  "scripts": {
    "start": "node server/server.js",
    "dev": "node --watch server/server.js"
  },
  "keywords": ["file-explorer", "vanilla-js"],
  "author": "",
  "license": "MIT"
}
```

## 🚀 Cómo Ejecutar el Proyecto

### Modo desarrollo

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

El servidor iniciará en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
fileTree/
├── server/
│   ├── server.js           # Servidor HTTP principal
│   ├── router.js            # Enrutador de peticiones
│   ├── fileController.js    # Controladores de endpoints
│   ├── fileService.js       # Lógica de negocio de archivos
│   ├── logger.js            # Sistema de logs
│   ├── helpers.js           # Funciones auxiliares
│   ├── files/               # Carpeta raíz a explorar
│   │   └── (archivos y carpetas del usuario)
│   └── logs/
│       └── app.log          # Registro de operaciones
├── public/
│   ├── index.html           # Estructura HTML
│   ├── css/
│   │   └── styles.css       # Estilos del explorador
│   └── js/
│       ├── app.js           # Controlador principal DOM
│       ├── tree.js          # Construcción del árbol
│       ├── preview.js       # Vista previa de archivos
│       ├── upload.js        # Subida con progreso
│       └── api.js           # Cliente API REST
├── package.json
└── README.md
```

## 🔌 API Endpoints

### GET /api/files
Lista archivos y carpetas de forma recursiva

**Query params:**
- `path` (opcional): Ruta relativa

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "name": "files",
    "path": "/",
    "type": "directory",
    "children": [...]
  }
}
```

### POST /api/rename
Renombra un archivo o carpeta

**Body:**
```json
{
  "oldPath": "folder/file.txt",
  "newName": "newfile.txt"
}
```

### DELETE /api/delete
Elimina un archivo o carpeta

**Query params:**
- `path`: Ruta del archivo/carpeta

### GET /api/download
Descarga un archivo

**Query params:**
- `path`: Ruta del archivo

### POST /api/upload
Sube uno o más archivos

**Content-Type:** `multipart/form-data`

**Fields:**
- `files`: Archivo(s) a subir
- `path`: Ruta de destino

## 📚 Módulos del Backend

### server.js
Servidor HTTP principal que:
- Crea el servidor en el puerto 3000
- Sirve archivos estáticos de `/public`
- Delega las peticiones API al router
- Implementa timeout de 30 segundos

### router.js
Enrutador que:
- Parsea URLs y métodos HTTP
- Dirige peticiones a los controladores correspondientes
- Maneja errores 404
- Implementa rate limiting básico

### fileController.js
Controladores que:
- Validan las peticiones
- Llaman a los servicios correspondientes
- Formatean las respuestas JSON
- Manejan errores HTTP

### fileService.js
Servicios que:
- Implementan la lógica de negocio
- Interactúan con el sistema de archivos
- Sanitizan y validan rutas
- Ejecutan operaciones CRUD

### logger.js
Sistema de logs que:
- Registra todas las operaciones
- Incluye timestamp, IP, acción y archivo
- Escribe en archivo `/logs/app.log`
- Formatea mensajes de forma legible

### helpers.js
Funciones auxiliares:
- Sanitización de rutas
- Validación de nombres de archivo
- Detección de tipos MIME
- Parseo de multipart/form-data

## 🎨 Módulos del Frontend

### app.js
Controlador principal:
- Inicializa la aplicación
- Maneja eventos del DOM
- Coordina los demás módulos
- Gestiona el estado de la UI

### tree.js
Construcción del árbol:
- Renderiza la estructura de carpetas
- Maneja expansión/colapso
- Crea nodos dinámicamente
- Aplica estilos según tipo

### preview.js
Vista previa:
- Muestra modal con imagen
- Muestra información de archivo
- Maneja diferentes tipos de archivo
- Cierra modal con ESC o click

### upload.js
Subida de archivos:
- Maneja drag & drop
- Muestra barra de progreso
- Usa XMLHttpRequest para progreso
- Refresca el árbol al completar

### api.js
Cliente API:
- Encapsula todas las llamadas al backend
- Maneja errores de red
- Retorna promesas
- Parsea respuestas JSON

## 🔒 Buenas prácticas y seguridad

### Sanitización de rutas
```javascript
// Previene path traversal attacks
const safePath = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
```

### Rate Limiting
- Máximo 100 peticiones por IP por minuto
- Previene ataques de denegación de servicio

### Validación de nombres
```javascript
// Previene nombres de archivo peligrosos
const invalidChars = /[<>:"|?*\x00-\x1f]/g;
const isValid      = !invalidChars.test(filename);
```

### Timeouts
- Timeout de 30 segundos en el servidor
- Previene conexiones colgadas

### Logs detallados
- Registra todas las operaciones
- Incluye IP de origen
- Facilita auditoría y debugging

### Manejo de errores
- Try-catch en todas las operaciones async
- Mensajes de error descriptivos
- Status codes HTTP apropiados

## ⚠️ Solución de Problemas

### El servidor no inicia
```bash
# Verificar que el puerto 3000 esté disponible
lsof -i :3000  # En Linux/Mac
netstat -ano | findstr :3000  # En Windows

# Cambiar el puerto en server.js si es necesario
const PORT = process.env.PORT || 3000;
```

### No se pueden subir archivos
- Verificar permisos de escritura en `/server/files`
- Verificar que el tamaño del archivo no exceda límites

### Error "ENOENT" al listar archivos
- Verificar que la carpeta `/server/files` existe
- Crear manualmente si es necesario: `mkdir server/files`

### Los logs no se generan
- Verificar permisos de escritura en `/server/logs`
- Crear la carpeta si no existe: `mkdir server/logs`

### CORS errors en el navegador
- Asegurarse de acceder vía `http://localhost:3000`
- No abrir `index.html` directamente desde el sistema de archivos

## 📝 Notas Adicionales

### Personalización

**Cambiar puerto del servidor:**
```javascript
// En server.js
const PORT = process.env.PORT || 8080;
```

**Cambiar carpeta raíz:**
```javascript
// En fileService.js
const ROOT_DIR = path.join(__dirname, 'mi-carpeta');
```

**Limitar tipos de archivo:**
```javascript
// En fileController.js
const ALLOWED_EXTENSIONS = ['.jpg', '.png', '.pdf', '.txt'];
```

### Limitaciones conocidas
- No soporta archivos mayores a 100MB por defecto
- La vista previa solo funciona con imágenes
- No incluye cifrado de archivos
- Rate limiting básico (puede mejorarse)
