# Data Explorer

Aplicación de escritorio para explorar, analizar y consultar datos. Construida con **Tauri 2**, **React 19**, **TypeScript**, **Vite** y **Polars** (motor de datos en Rust).

## Características

- **Carga de datos**: abre archivos **JSON**, **CSV**, **Parquet** y **Excel** (.xlsx/.xls).
- **Pegar JSON**: pega contenido JSON directamente desde el portapapeles como un dataset.
- **SQL sobre los datos**: editor SQL con autocompletado (CodeMirror) que ejecuta consultas sobre los datasets cargados usando el motor `sql` de Polars.
- **Múltiples pestañas**: cada dataset/consulta se abre en su propia pestaña.
- **Exportación**: exporta resultados a **CSV**, **Parquet** o **JSON**.
- **Conexión S3**: guarda perfiles (credenciales) y buckets, navega objetos y carga archivos directamente desde S3 (AWS o compatibles con endpoint personalizado).
- **Visualización de datos**: tabla virtualizada con soporte para valores JSON (árbol, vista previa y celdas anidadas), perfil de datos y modal de esquema.
- **Atajos de teclado**: panel de accesos rápidos e integración por teclado.
- **Tema claro/oscuro**.

## Requisitos previos

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/) (toolchain estable)
- Plataforma soportada: **Windows** (también funciona en macOS/Linux si se configuran los targets)

## Desarrollo

```bash
# Instalar dependencias del frontend
npm install

# Iniciar el frontend (Vite) y la app Tauri en modo dev
npm run tauri dev
```

## Compilación

```bash
# Compilar solo el frontend
npm run build

# Compilar el instalador de escritorio (NSIS .exe / MSI)
npm run tauri build
```

Los artefactos generados quedan en `src-tauri/target/release/bundle/`.

## Publicación de versiones

El proyecto incluye un workflow de CI/CD en `.github/workflows/release.yml`.

Para generar un **release con instaladores**:

1. Crea un tag con el prefijo `v` (ej. `v0.1.0`).
2. Haz push del tag al repositorio.
3. GitHub Actions compilará la aplicación en Windows y publicará automáticamente un Release en GitHub con los instaladores adjuntos.

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Atajos de teclado

| Atajo | Acción |
| ----- | ------ |
| `Ctrl+Shift+O` | Abrir archivo |
| `Ctrl+Shift+E` | Exportar datos |
| `Ctrl+Shift+F` | Buscar / filtrar |
| `Ctrl+Shift+K` | Editor SQL |
| `Ctrl+Shift+J` | Pegar JSON |
| `Ctrl+Shift+S` | Conectar S3 |
| `Ctrl+Shift+L` | Atajos de teclado |
| `Ctrl+Shift+T` | Nueva pestaña |
| `Ctrl+Shift+W` | Cerrar pestaña |
| `Ctrl+Shift+D` | Modo oscuro / claro |
| `Ctrl+Shift+I` | Perfil de datos |
| `Ctrl+Enter` | Ejecutar query SQL |

## Estructura del proyecto

```
data-explorer/
├── src/                  # Frontend (React + TypeScript)
│   ├── components/       # Componentes UI (editor SQL, tablas, modales, etc.)
│   ├── hooks/            # Hooks (useHotkeys)
│   ├── lib/              # Utilidades (shortcuts)
│   ├── services/         # Repositorio de datos (invocaciones a Tauri)
│   └── types/            # Tipos compartidos
├── src-tauri/            # Backend (Rust)
│   └── src/
│       ├── commands/     # Comandos Tauri (archivos, SQL, export, S3)
│       ├── loaders/      # Loaders: JSON, CSV, Parquet, Excel
│       ├── repositories/ # Persistencia (perfiles S3, etc.)
│       └── services/     # LoaderService, SqlEngine
├── public/               # Recursos estáticos
└── package.json
```

## Stack

- **Tauri 2** + plugins (`dialog`, `opener`, `store`, `log`)
- **React 19** + **TypeScript**
- **Vite 8** + **Tailwind CSS 4**
- **Polars** (parquet, csv, json, sql, lazy)
- **CodeMirror 6** (editor SQL con autocompletado)
- **TanStack Table + Virtual** (tabla virtualizada)
- **AWS SDK for Rust** (S3)