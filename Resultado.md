# Resultado — "¿Qué Dice Mi Mascota?"

Prototipo web de escritorio (Windows, Chrome/Edge) que muestra, como subtítulo de película, lo que un perro o gato "dice" en un video corto (máx 60 s) según su estado de ánimo. Todo el análisis se calcula en el navegador con código propio: cero servicios externos, cero IA externa, cero red en tiempo de ejecución y sin backend.

## Stack real (verificado en el workspace)

- **Next.js 14.2.35 (App Router)** + **React 18.3.1** + **TypeScript 5.6.2** (todas las páginas cliente, páginas estáticas).
- Dependencias runtime mínimas: solo `next`, `react`, `react-dom`. Dev: `typescript`, `@types/*` (ver `package.json`).
- Persistencia 100 % local del navegador: **IndexedDB** (`lib/historial.ts`) para el historial y **localStorage** (`lib/preferencias.ts`) para las preferencias.
- No hay `migrations/`, ni archivos `.sql`, ni `.env`, ni `process.env`, ni `app/api/`, ni server actions (verificado en la estructura del repo).

## Qué se construyó, por épica/módulo

### Épica 1 — Carga del video (Inicio, ruta `/`)
`app/page.tsx` (máquina de estados `inicio → analizando → resultado`) + `app/components/CargarVideo.tsx`:
- Drag & drop a nivel ventana + botón "Elegir un video" (`<input type="file" accept="video/*">`).
- Grabación con webcam: `getUserMedia` + `MediaRecorder`, máx 10 s, mín 2 s, corte automático, cuenta regresiva y rechazo con mensaje si dura menos de 2 s (lógica real en `CargarVideo.tsx`).
- Validación de duración/tipo en `lib/video.ts` → `verificarDuracion(file)`: "ese archivo no es un video" / "usa un video de menos de 1 minuto".
- Selector de especie obligatorio (Perro/Gato, recordado en localStorage) y selector de tono (Tierno por defecto / Sarcástico).
- Botón "Analizar" solo habilitado con video validado + especie elegida. Atajos Espacio (grabar/parar) y Enter (analizar), visibles en el pie.

### Épica 2 — Análisis (espectáculo 2,5–4 s)
`app/components/Analizando.tsx`:
- 4 etapas secuenciales con checkmark: "Detectando a tu mascota", "Midiendo nivel de energía", "Escuchando vocalizaciones", "Traduciendo al español".
- Duración garantizada de 2,5 s mín y 4 s máx aunque el análisis JS termine antes (también bloqueada desde `app/page.tsx` con `ANALISIS_MIN_MS`/`ANALISIS_MAX_MS`).
- Fondo: frame capturado del video con blur CSS.

### Épica 3 — Resultado
`app/components/Resultado.tsx`:
- Dos columnas ≥1024 px, apiladas a 400 px (`grid-resultado` en `app/globals.css`).
- Video en loop silencioso con **subtítulo tipo película** (fondo semitransparente sobre el frame).
- Panel: emoji + nombre del ánimo, **certeza 72–96 %** con barrita (`role="meter"`), bloque "Cómo llegué a esto" (energía/voz/duración en texto humano), botones:
  - 🎲 Otra traducción (R) — cambia frase sin repetir la inmediatamente anterior (`elegirFrase` con `ultimoId`).
  - 🎭 Cambiar tono (T) — recalcula la frase al instante sin re-analizar.
  - 📋 Copiar la frase (Clipboard API con fallback `execCommand`).
  - 🖼️ Guardar imagen — genera PNG 1080×1080 (frame + frase + ánimo + chip especie + branding) en `lib/video.ts` → `generarCanvas1080`.
  - 🔄 Analizar otro video (N) — vuelve al inicio limpiando el estado y revocando el object URL.
- Guardado automático en historial con miniatura ≤ 40 KB, y línea de honestidad "Esto es un juego, no ciencia real".

### Épica 4 — Historial (ruta `/historial`)
`app/historial/page.tsx` + `TarjetaHistorial.tsx`, `DetalleTraduccion.tsx`, `ConfirmarBorrado.tsx`:
- Grilla de tarjetas con miniatura, emoji del ánimo, frase y fecha relativa ("hace 2 horas").
- Clic en tarjeta abre modal de detalle: frase grande, video si aún está guardado, opción de re-guardar imagen.
- Borrado individual y borrado total con modales de confirmación (foco atrapado, cierre con Esc).
- Estado vacío con guía: "Todavía no traduces nada…" y botón "Ir a traducir".
- Persistente entre recargas y reaperturas del navegador (IndexedDB).
- Solo los últimos 10 registros conservan el blob de video; el 11.º borra el blob más antiguo (mantiene la fila como metadato).

### Épica 5 — Motor de traducción determinista (núcleo, sin React)
- `lib/types.ts`: tipos compartidos (`Especie`, `Tono`, `EstadoAnimo` ×6, `Señales`, `AnalisisCompleto`, `DatosHistorial`, `EtapaAnalisis`).
- `lib/analisis.ts` — API única que consume la UI (3 funciones):
  - `analizarVideo(fuente)`: ~10 frames a 160×120, diferencia media de píxeles en grises entre frames consecutivos → energía 0–100; `AudioContext.decodeAudioData` → pico/RMS 0–100 y eventos sonoros (picos sobre umbral separados ≥300 ms); duración en segundos.
  - `clasificar(señales, especie)`: matriz energía×voz bajo/medio/alto por especie (perro/gato) → ánimo + certeza determinsta (60–99, la UI la mapea a 72–96).
  - `elegirFrase(animo, especie, tono, semilla, indice, ultimoId)`: selección determinista por semilla (FNV-1a + Mulberry32) que nunca repite la frase inmediatamente anterior.
- `lib/frases.ts`: banco anidado `[animo][especie][tono]` con **≥5 frases por grupo (120 en total)**, ≤120 caracteres cada una (validado en runtime al cargar), primera persona, tuteo chileno, sin groserías; `ETIQUETAS` con nombre legible + emoji de cada ánimo.
- `lib/video.ts`: `capturarFrame` (miniatura), `verificarDuracion`, `generarCanvas1080` (PNG para compartir).
- `lib/historial.ts`: `HistorialDB.guardar/listar/borrar/borrarTodo`, miniaturas ≤40 KB re-comprimidas, límite de 10 blobs de video.
- `lib/preferencias.ts`: `getPreferencia`/`setPreferencia` con claves deny-by-default (solo `especie` y `tono`).

### UI / Diseño
- `app/layout.tsx`: layout raíz con `Encabezado`, `<main>`, `LineaHonestidad` en footer, metadata estática, fuente del sistema (sin CDN).
- `app/globals.css`: design system con tokens CSS, dark mode por `prefers-color-scheme`, animaciones de entrada, blur backdrop, barra de certeza, grilla responsiva, subtítulo tipo película, hover/foco visibles, `prefers-reduced-motion`.
- `app/components/Encabezado.tsx` (marca + nav a `/historial`) y `LineaHonestidad.tsx` (aviso de no-ciencia + atajos de teclado).
- `design/UX_PLAN.md`, `design/UX_GUIDELINES.md`, `.codegraph/ux_review.json`: documentos de diseño/UX del prototipo.

## Archivos generados (lista real)

```
package.json, package-lock.json, tsconfig.json, next-env.d.ts, next.config.mjs, .gitignore
app/layout.tsx
app/page.tsx
app/globals.css
app/historial/page.tsx
app/components/CargarVideo.tsx
app/components/Analizando.tsx
app/components/Resultado.tsx
app/components/TarjetaHistorial.tsx
app/components/DetalleTraduccion.tsx
app/components/ConfirmarBorrado.tsx
app/components/Encabezado.tsx
app/components/LineaHonestidad.tsx
lib/types.ts
lib/analisis.ts
lib/frases.ts
lib/historial.ts
lib/video.ts
lib/preferencias.ts
design/UX_PLAN.md
design/UX_GUIDELINES.md
.spec.md, plan.json (documentación del run)
```

## Cómo correrlo

```bash
npm install
npm run dev        # abre http://localhost:3000 (sin configurar nada)
npm run build      # build de producción sin errores TS
npm run start      # sirve el build
```

Requiere Node instalado (objetivo Node 24, Windows); se navega con Chrome o Edge. `node_modules/` y `.next/` ya existen en el workspace (build previo presente).

## Criterios de aceptación CUBIERTOS (evidencia en código)

- **AC-G1 / AC-G2 / AC-G3**: `npm run dev`/`build` estándar de Next; sin Supabase, sin `migrations/`, sin `.sql`, sin `.env`, sin `process.env`, sin API routes/server actions; sin CDN ni fuentes remotas (solo `--font-sans` del sistema) → funciona sin red.
- **AC1.1–AC1.4**: drag & drop + "Analizar" habilitado solo con video+especie; webcam con cuenta regresiva 10 s y rechazo <2 s; sin cámara → mensaje claro + camino de arrastrar.
- **AC1.5–AC1.7**: mensajes de error para no-video y >60 s; especie obligatoria recordada en localStorage; atajos visibles y funcionales.
- **AC2.1–AC2.3**: 4 etapas en orden fijo con duración total 2,5–4 s (bloqueo en `page.tsx` + watchdog en `Analizando`); fondo con frame blur.
- **AC3.1–AC3.10**: 2 columnas ≥1024 px / apilado a 400 px; loop silencioso + subtítulo; ánimo + certeza 72–96 % con barrita + "Cómo llegué a esto"; "R" sin repetir la anterior; "T" sin re-procesar; copiar con feedback; PNG 1080×1080 descargable; "N" vuelve a inicio; guardado automático en IndexedDB; línea de honestidad en resultado.
- **AC4.1–AC4.5**: grilla con miniatura/emoji/frase/fecha relativa; detalle con video y re-guardar imagen; borrado individual y total con confirmación; estado vacío con guía; persistencia entre recargas.
- **AC5.x**: motor determinista (misma entrada → misma salida: semilla FNV-1a + Mulberry32); sin audio → se analiza igual y muestra "Sin audio en este video"; ≥120 frases, ≤120 chars, primera persona, tuteo chileno, sin groserías.
- **AC7.x / AC8.x**: `HistorialDB` con las 4 operaciones; miniaturas ≤40 KB; máx 10 blobs de video; preferencias recordadas; app operable por teclado + atajos Espacio/Enter/R/T/N; sin desbordes a 400 px; tuteo chileno consistente.

## Pendientes / limitaciones reales

- **No es ciencia real (por diseño)**: la "inferencia" es una heurística determinista (energía de movimiento + pico/RMS/eventos de audio + matriz por especie). La certeza se muestra inflada (72–96 %) y las frases son de un banco cerrado en español de Chile; no hay reconocimiento de voz, razas ni mascota específica.
- **Prototipo en navegador, no app instalable**: no hay PWA/offline installable ni Electron/Tauri; corre como sitio local en el navegador.
- **Dependencia de APIs del navegador**: IndexedDB, localStorage, MediaRecorder/getUserMedia, AudioContext, Canvas y Clipboard deben estar disponibles; en contextos sin permisos o con formatos de video/códec no decodificables por el navegador, la captura o el análisis pueden fallar (los fallos se muestran con mensajes claros, no rompen la app).
- **Persistencia por navegador**: historial y preferencias viven solo en el navegador donde se usó la app; no hay sincronización entre dispositivos (fuera de alcance).
- **Solo perro y gato**, videos ≤60 s, frases en tuteo chileno.
- La app corre local y offline; al desplegarse como sitio web (p. ej. Railway) se sirve igualmente estática, pero la cámara/redes locales siguen dependiendo del host del visitante.

## Despliegue

✅ Desplegado y verificado en Railway (build OK).