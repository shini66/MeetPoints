# MeetPoints

App de escritorio local (Electron) para no olvidarte de los puntos clave en cada entrevista a candidatos. Corre 100% offline, guarda todo en un archivo SQLite local usando `sql.js` (no necesita compilar nada nativo, así que `npm install` no debería darte problemas en Windows/Mac/Linux).

## Instalación

Necesitás Node.js instalado (cualquier versión reciente sirve).

```bash
cd meetpoints
npm install
npm start
```

Se abre una ventana de escritorio. Así de simple.

## Cómo se usa

- **Lista de puntos**: tildá cada uno a medida que lo mencionás en la entrevista, o borralo con el botón **Eliminar**.
- **Agregar punto**: abre un formulario con título y descripción.
- **↻ Nueva entrevista**: destilda todos los checks — pero **mantiene tu lista de puntos**, así no tenés que reescribirla cada vez.

Todo se guarda automáticamente (sin botón de "guardar"): cada cambio se persiste solo, con un pequeño delay para no escribir en disco en cada tecla.

## Dónde queda guardada la info

La base SQLite vive en la carpeta de datos de usuario de tu sistema (fuera de la carpeta del proyecto), algo como:

- **Windows**: `%APPDATA%\meetpoints\meetpoints.sqlite`
- **Mac**: `~/Library/Application Support/meetpoints/meetpoints.sqlite`
- **Linux**: `~/.config/meetpoints/meetpoints.sqlite`

Si alguna vez querés arrancar de cero del todo (perder también la lista de puntos), simplemente borrá ese archivo — la app crea uno nuevo (vacío) la próxima vez que la abras.

## Generar los ejecutables de Windows

```bash
npm run dist
```

Genera dos artefactos en `release/` (con `electron-builder`, configurado en `package.json`, campo `build`):

- **`MeetPoints <versión>.exe`**: portable, un solo archivo, no requiere instalación ni Node.js. Ideal para probar rápido o llevar en un pendrive.
- **`MeetPoints Setup <versión>.exe`**: instalador NSIS. Se instala en `%LOCALAPPDATA%\Programs\meetpoints`, queda en "Agregar o quitar programas", y al desinstalar borra también los datos guardados (`deleteAppDataOnUninstall`).

## Estructura del proyecto

```
meetpoints/
├── main.js          # proceso principal de Electron, crea la ventana y expone la API vía IPC
├── preload.js       # puente seguro entre el renderer y el proceso principal
├── db.js            # toda la lógica de SQLite (sql.js)
├── renderer/
│   ├── index.html
│   ├── style.css
│   └── renderer.js  # lógica de la interfaz, llama a window.api
└── package.json
```
