# Entrevistas - Checklist

App de escritorio local (Electron) para no olvidarte de los puntos clave en cada entrevista a candidatos. Corre 100% offline, guarda todo en un archivo SQLite local usando `sql.js` (no necesita compilar nada nativo, así que `npm install` no debería darte problemas en Windows/Mac/Linux).

## Instalación

Necesitás Node.js instalado (cualquier versión reciente sirve).

```bash
cd entrevistas-checklist
npm install
npm start
```

Se abre una ventana de escritorio. Así de simple.

## Cómo se usa

- **Arriba**: nombre del candidato y puesto.
- **Lista de puntos**: tildá cada uno a medida que lo mencionás en la entrevista. Podés editar el texto de cualquier punto haciendo click sobre él, borrarlo con la ✕, o agregar puntos nuevos abajo con el botón **+**.
- **Notas**: para lo que te diga el candidato.
- **↻ Nueva entrevista**: limpia candidato, puesto, notas y destilda todos los checks — pero **mantiene tu lista de puntos**, así no tenés que reescribirla cada vez.

Todo se guarda automáticamente (sin botón de "guardar"): cada cambio se persiste solo, con un pequeño delay para no escribir en disco en cada tecla.

## Dónde queda guardada la info

La base SQLite vive en la carpeta de datos de usuario de tu sistema (fuera de la carpeta del proyecto), algo como:

- **Windows**: `%APPDATA%\entrevistas-checklist\entrevistas.sqlite`
- **Mac**: `~/Library/Application Support/entrevistas-checklist/entrevistas.sqlite`
- **Linux**: `~/.config/entrevistas-checklist/entrevistas.sqlite`

Si alguna vez querés arrancar de cero del todo (perder también la lista de puntos), simplemente borrá ese archivo — la app crea uno nuevo con los 4 puntos por defecto la próxima vez que la abras.

## Empaquetar como .exe / .app (opcional, a futuro)

Este proyecto no incluye empaquetado todavía (`npm start` corre la app en modo desarrollo). Si más adelante querés un instalador o un .exe standalone para no depender de tener Node instalado, se agrega con `electron-builder` — avisame y te lo sumo.

## Estructura del proyecto

```
entrevistas-checklist/
├── main.js          # proceso principal de Electron, crea la ventana y expone la API vía IPC
├── preload.js       # puente seguro entre el renderer y el proceso principal
├── db.js            # toda la lógica de SQLite (sql.js)
├── renderer/
│   ├── index.html
│   ├── style.css
│   └── renderer.js  # lógica de la interfaz, llama a window.api
└── package.json
```
