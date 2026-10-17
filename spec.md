# Especificación Técnica — "¿Qué Dice Mi Mascota?"

Prototipo web de escritorio (Windows, Chrome/Edge): el usuario sube o graba un video corto de su perro o gato (≤ 60 s) y la app muestra, como subtítulo de película, lo que la mascota "dice": frase en primera persona, estado de ánimo, certeza y bloque "Cómo llegué a esto" con las señales medidas. Todo se calcula en el navegador, sin red, sin backend, sin IA externa.

- **Stack:** Next.js (App Router) + TypeScript, todo client-side, páginas estáticas.
- **Target:** Node 24 en Windows; `npm install` → `npm run dev` en localhost:3000; `npm run build` sin errores.
- **Persistencia:** IndexedDB (historial + blobs de video) y localStorage (preferencias). No requiere backend ni DB.

---

## 1. Objetivo y alcance

**Incluido:** 3 vistas (Inicio/Carga, Analizando, Resultado) + Historial en encabezado; drag & drop en toda la ventana, botón "Elegir un video" y grabación con webcam (getUserMedia + MediaRecorder, máx 10 s, mín 2 s, cuenta regresiva y corte automático); selector de especie (Perro/Gato, obligatorio, recordado en localStorage) y tono (Tierno por defecto / Sarcástico); validación de archivo (tipo video, ≤ 60 s); pantalla de análisis espectacularizada (3–4 s, 4 etapas, frame con blur); resultado con video en loop silencioso + subtítulo, ánimo con emoji, certeza 72–96 % con barrita, "Cómo llegué a esto" (energía/voz/duración), acciones (Otra traducción, Cambiar tono, Copiar frase, Guardar imagen PNG 1080×1080, Analizar otro video); guardado automático en historial; historial con miniatura/emoji/frase/fecha relativa, detalle con video si existe, borrado individual y total con confirmación, estado vacío con guía; diseño responsive (1200 px máx, 2 columnas ≥1024, apilado a 400), accesible por teclado con hover/foco; línea de honestidad en pie y resultado; README con pasos exactos.

**Fuera de alcance:** login/cuentas/registro, cualquier backend o DB, sincronización entre dispositivos, reconocimiento de razas o de mascota específica, modelos de visión/audio, voz sintetizada, feed/ranking, notificaciones, pagos, especies distintas a perro/gato, análisis en vivo sin grabar, Electron/Tauri, app nativa, PWA/offline, panel de administración, APIs de IA externas.

**Restricciones duras:** cero servicios externos (sin Supabase, sin migrations/, sin .sql, sin process.env, sin variables de entorno); cero IA externa (inferencia con código propio en `lib/analisis.ts` + `lib/frases.ts`); cero red en runtime (fuentes del sistema o empaquetadas, sin CDN, sin analítica; funciona con wifi apagado); sin API routes ni server actions; corre local en Windows Node 24; sin login.

---

## 2. Épicas y funcionalidades

### Épica 1 — Carga del video (Inicio)
- F1.1 Drag & drop sobre toda la ventana.
- F1.2 Botón "Elegir un video" (`<input type="file" accept="video/*">`).
- F1.3 "Grabar con la webcam": getUserMedia con audio + MediaRecorder, máx 10 s, mín 2 s, cuenta regresiva, corte automático.
- F1.4 Error de cámara/permiso con mensaje claro y camino de arrastrar siempre disponible.
- F1.5 Especie: dos tarjetas con ícono Perro/Gato, obligatoria, última elección en localStorage.
- F1.6 Tono: chips Tierno (default) / Sarcástico.
- F1.7 Validación: no-video → "ese archivo no es un video"; > 60 s → "usa un video de menos de 1 minuto"; sin romper nada.
- F1.8 Atajos visibles en pie: Espacio graba/para, Enter analiza.
- F1.9 "Analizar" habilitado solo con video validado + especie elegida.

### Épica 2 — Análisis (espectáculo, 3–4 s)
- F2.1 4 etapas marcadas una a una: "Detectando a tu mascota...", "Midiendo nivel de energía...", "Escuchando vocalizaciones...", "Traduciendo del maullido al español...".
- F2.2 Etapas paralelas al análisis; si termina antes, se muestran todas igual: total mín 2,5 s, máx 4 s.
- F2.3 Fondo: frame del video con blur.

### Épica 3 — Resultado
- F3.1 Dos columnas ≥1024 px; apiladas por debajo.
- F3.2 Izquierda: video loop, silencioso, frase como subtítulo de película (fondo semitransparente, texto grande) + controles mínimos.
- F3.3 Derecha: emoji + nombre del ánimo ("Juguetón", "En modo zen", "Reclamando comida"...).
- F3.4 Certeza % (72–96) con barrita.
- F3.5 Bloque "Cómo llegué a esto": energía ("mucho movimiento"), voz ("ladró 2 veces" o "sin audio en este video"), duración ("8 segundos").
- F3.6 "Otra traducción": misma mascota/video/ánimo, otra frase, nunca la anterior.
- F3.7 "Cambiar tono": recalcula frase al instante, sin re-analizar.
- F3.8 "Copiar la frase" (Clipboard API).
- F3.9 "Guardar imagen": canvas → PNG 1080×1080 (frame + frase + ánimo + nombre app) descargado localmente.
- F3.10 "Analizar otro video": vuelve al inicio.
- F3.11 Guardado automático en historial (IndexedDB).
- F3.12 Atajos: R otra traducción, T cambiar tono, N analizar otro video.
- F3.13 Línea de honestidad visible.

### Épica 4 — Historial ("Mis traducciones")
- F4.1 Grilla: miniatura del frame, emoji, frase, fecha relativa ("hace 2 horas").
- F4.2 Tarjeta abre frase en grande + video si está guardado + volver a guardar imagen.
- F4.3 Borrar individual.
- F4.4 Borrar todo con confirmación.
- F4.5 Vacío: "todavía no traduces nada: arrastra un video de tu mascota y vuelve".

### Épica 5 — Motor de traducción determinista (núcleo, sin React)
- F5.1 `lib/analisis.ts` exporta solo 3 funciones: `analizarVideo(fuente): Promise<Señales>`, `clasificar(señales, especie): { animo, certeza }`, `elegirFrase(animo, especie, tono, semilla, indice): string`. La UI solo las conoce (reemplazable por un modelo local sin tocar pantallas).
- F5.2 Energía: ~10 frames repartidos, canvas 160×120, diferencia media de píxeles en grises entre frames consecutivos, normalizada 0–100.
- F5.3 Voz: AudioContext.decodeAudioData; pico y RMS normalizados 0–100; eventos sonoros = picos sobre umbral separados ≥ 300 ms ("ladró 2 veces").
- F5.4 Duración: segundos del video.
- F5.5 Clasificación energía/voz en bajo/medio/alto + matriz por especie (tabla §4.2).
- F5.6 Certeza determinista (sin Math.random): señales nítidas → 88–96 %; ambiguas → 72–82 %.
- F5.7 Semilla determinista FNV-1a(duración + tamaño archivo + señales): mismo video → mismo resultado.
- F5.8 "Otra traducción" avanza índice del banco sin repetir la anterior.
- F5.9 Robustez: sin audio decodificable o sin pista, NO falla: clasifica solo con energía y duración y el resultado dice "sin audio en este video".

### Épica 6 — Banco de frases
- F6.1 `lib/frases.ts`: ≥ 5 frases por cada combinación especie (2) × ánimo (6) × tono (2) = 24 grupos → ≥ 120 frases.
- F6.2 Frases ≤ 120 caracteres, primera persona, español de Chile natural, sin groserías; estilo de los ejemplos del PRD (perro eufórico tierno/sarcástico, gato zen absoluto tierno, gato reclamando comida sarcástico, perro zen tierno, gato evaluándote sarcástico, etc.).

### Épica 7 — Persistencia local
- F7.1 `lib/historial.ts` sobre IndexedDB: `guardar / listar / borrar / borrarTodo`.
- F7.2 Registro: id, fecha, especie, animo, tono, frase, certeza, energia, voz, eventosVoz, duracionSeg + miniatura (JPEG ≤ 40 KB).
- F7.3 videoBlob solo para las últimas 10; al guardar la 11 se borra el blob más antiguo conservando registro y miniatura.
- F7.4 Preferencias (especie/tono) en localStorage.
- F7.5 Nada sale del computador.

### Épica 8 — Diseño, accesibilidad, honestidad
- F8.1 Centrado, ~1200 px máx, 2 columnas en resultado, tipografía grande, colorido, animaciones suaves al pasar a resultado.
- F8.2 Hover/foco visibles; navegable con teclado.
- F8.3 OK a 400 px (columnas apiladas; base móvil futura).
- F8.4 Pie en todas las vistas + resultado: "Esto es entretenimiento, no ciencia: las frases son inventadas a partir del movimiento y el sonido del video. Si te preocupa la salud o la conducta de tu mascota, consulta a un veterinario."
- F8.5 Nunca prometer traducción real ni IA entrenada.
- F8.6 Español de Chile con tuteo (nunca "vos"/"usted").

---

## 3. Modelo de datos (sin DB: IndexedDB + localStorage)

### 3.1 Traducción — IndexedDB store `traducciones`
| Campo | Tipo | Descripción |
|---|---|---|
| id | string | UUID (crypto.randomUUID). |
| fecha | number | Epoch ms. |
| especie | 'perro' \| 'gato' | Especie. |
| animo | string | Clave del ánimo (§4.2). |
| tono | 'tierno' \| 'sarcastico' | Tono. |
| frase | string | Frase (≤ 120 chars). |
| certeza | number | Entero 72–96. |
| energia | number \| null | 0–100 (null si no se midió). |
| voz | number \| null | 0–100 (null sin audio). |
| eventosVoz | number | Eventos sonoros (0 sin audio). |
| duracionSeg | number | Segundos. |
| miniatura | Blob | Frame JPEG ≤ 40 KB. |
| videoBlob | Blob \| null | Video original; solo en las últimas 10. |

Regla: al guardar el registro 11 con blob, se borra el blob más antiguo (registro y miniatura permanecen).

### 3.2 Preferencias — localStorage
- `pref.especie`: 'perro' | 'gato' (preselección sugerida).
- `pref.tono`: 'tierno' (default) | 'sarcastico'.

---

## 4. Motor de traducción

### 4.1 Interfaz de `lib/analisis.ts`
```ts
type Especie = 'perro' | 'gato';
type Tono = 'tierno' | 'sarcastico';
interface Señales {
  energia: number;      // 0-100
  voz: number;          // 0-100 (0 si no hay audio)
  eventosVoz: number;
  duracionSeg: number;
  hayAudio: boolean;
}
interface ResultadoClasificacion { animo: string; certeza: number; } // 72-96

async function analizarVideo(fuente: string | Blob): Promise<Señales>;
function clasificar(señales: Señales, especie: Especie): ResultadoClasificacion;
function elegirFrase(animo: string, especie: Especie, tono: Tono,
  semilla: number, indice: number): string; // indice 0 = primera; "Otra traducción" incrementa
```
- Semilla = FNV-1a(duracionSeg + tamañoBlob + energia + voz + eventosVoz).
- Energía por frames en canvas 160×120; voz por AudioContext; si no hay audio: hayAudio=false, voz=0, eventosVoz=0 y clasificar usa solo energía/duración sin fallar.

### 4.2 Matriz de estados de ánimo
| Energía | Voz | PERRO | GATO |
|---|---|---|---|
| alta | alta | Eufórico | Exigiendo algo ya |
| alta | baja | Juguetón | En modo cacería |
| media | alta | Alerta | Conversador |
| media | baja | Curioso | Evaluándote |
| baja | alta | Quejándose | Reclamando comida |
| baja | baja | En modo zen | Zen absoluto |

Umbrales (constantes en `clasificar`), p.ej. energía/voz: 0–33 bajo, 34–66 medio, 67–100 alto. Certeza determinista según cercanía a los límites. La UI mapea claves → etiquetas humanas + emoji.

### 4.3 Banco de frases (`lib/frases.ts`)
- `Record<Especie, Record<animo, Record<Tono, string[]>>>` con ≥ 5 frases por grupo (24 grupos, ≥ 120 frases).
- `elegirFrase`: índice inicial derivado de la semilla; avanza con `indice` sin repetir la anterior (al agotar, reinicia saltando la última).

---

## 5. Rutas / Páginas (App Router, client-side, estáticas)

| Ruta | Archivo | Contenido |
|---|---|---|
| `/` | app/page.tsx | Vista Inicio (Épica 1) con fases Cargar → Analizando → Resultado (Épicas 1–3) por estado en esta misma ruta. |
| `/historial` | app/historial/page.tsx | "Mis traducciones" (Épica 4), desde el encabezado. |
| Layout | app/layout.tsx | Encabezado con marca + enlace "Mis traducciones"; pie con honestidad y atajos (F1.8, F8.4); fuente del sistema o empaquetada. |
| Estilos | app/globals.css | Tokens, tipografía grande, hover/foco, grilla responsiva. |

Componentes sugeridos: `CargarVideo.tsx`, `Analizando.tsx`, `Resultado.tsx`, `TarjetaHistorial.tsx`, `DetalleTraduccion.tsx`, `ConfirmarBorrado.tsx`, `Encabezado.tsx`, `LineaHonestidad.tsx`. No hay más rutas.

---

## 6. Endpoints API

**Ninguno.** No hay API routes ni server actions. Todo procesamiento ocurre en el cliente (canvas, AudioContext, MediaRecorder, IndexedDB, localStorage, Clipboard). Páginas estáticas.

---

## 7. Criterios de aceptación (por épica)

**Épica 1:** AC1.1 drop acepta y habilita Analizar; de arrastrar a resultado = 2 acciones o menos (global 4). AC1.2 selector con accept="video/*". AC1.3 webcam con cuenta regresiva, corte a 10 s, rechaza < 2 s con mensaje. AC1.4 sin cámara/permiso → mensaje claro y drop disponible. AC1.5 mensajes "ese archivo no es un video" / "usa un video de menos de 1 minuto" sin romper. AC1.6 especie obligatoria y recordada (global). AC1.7 atajos visibles y funcionales.

**Épica 2:** AC2.1 4 etapas en orden, total 2,5–4 s aunque el análisis termine antes. AC2.2 video de 5 s → resultado < 5 s (global 5). AC2.3 frame con blur de fondo.

**Épica 3:** AC3.1 2 columnas ≥1024, apilado a 400. AC3.2 loop sin sonido con subtítulo legible y controles mínimos. AC3.3 emoji + ánimo + certeza con barrita + "Cómo llegué a esto". AC3.4 R cambia frase sin repetir la anterior (global 9). AC3.5 T cambia tono sin re-procesar. AC3.6 copia al portapapeles con feedback. AC3.7 PNG 1080×1080 legible (global 11). AC3.8 N vuelve al inicio. AC3.9 guardado automático en IndexedDB. AC3.10 honestidad en resultado.

**Épica 4:** AC4.1 grilla con miniatura/emoji/frase/fecha relativa. AC4.2 detalle con frase grande y video si existe + re-guardar imagen. AC4.3 borrado individual. AC4.4 borrado total con confirmación y estado vacío con guía. AC4.5 historial sobrevive a recarga y a cerrar/reabrir navegador (global 10).

**Épica 5:** AC5.1 las 3 funciones son la única API de la UI, sin React. AC5.2 mismo video → mismo ánimo/certeza/frase (global 6). AC5.3 quieto/silencioso vs movido/ladridos → ánimos distintos (global 7). AC5.4 sin audio se analiza igual y dice "sin audio en este video" (global 8).

**Épica 6:** AC6.1 ≥ 5 frases por combinación (≥ 120), ≤ 120 chars, primera persona, chileno, sin groserías.

**Épica 7:** AC7.1 historial.ts expone guardar/listar/borrar/borrarTodo. AC7.2 registros completos con miniatura ≤ 40 KB. AC7.3 solo últimas 10 con blob; la 11 borra el blob más antiguo (verificable en DevTools). AC7.4 preferencias recordadas. AC7.5 sin peticiones externas; funciona con wifi apagado (global 2).

**Épica 8:** AC8.1 toda la app con teclado + atajos Espacio/Enter/R/T/N y hover/foco (global 12). AC8.2 a 400 px apila sin desbordes. AC8.3 honestidad en pie y resultado; sin promesas de IA real. AC8.4 tuteo chileno consistente.

**Globales:** AC-G1 npm install + npm run dev en Windows Node 24 levanta localhost:3000 sin config; npm run build sin errores/warnings TS (global 1). AC-G2 sin Supabase, migrations/, .sql, claves API ni process.env (global 3). AC-G3 dependencias mínimas usando APIs del navegador.

---

## 8. Flujos de usuario críticos

Rol único: usuario final sin cuenta, PC Windows con Chrome/Edge.

### 8.1 Flujo crítico #1 — Traducir un video del disco (acción central del negocio)
1. Abre http://localhost:3000 en Chrome/Edge (Windows).
2. Ve la vista Inicio: zona "arrastra aquí tu video", botones "Elegir un video" y "Grabar con la webcam", selectores de especie y tono.
3. **Arrastra** el video desde el Explorador a cualquier parte de la ventana (o clic en "Elegir un video"). Se valida (tipo video, ≤ 60 s).
4. Elige la especie (Perro/Gato) si no viene preseleccionada de localStorage; elige tono.
5. Clic en "Analizar" (o Enter). Aparece "Analizando" con las 4 etapas y el frame con blur (2,5–4 s).
6. Ve el resultado: video en loop con subtítulo "que dice" la frase, ánimo con emoji, certeza con barrita y "Cómo llegué a esto".
7. (Opcional) Copia la frase, guarda el PNG o pulsa R para otra frase. El resultado ya quedó en el historial.
8. Pulsa N o "Analizar otro video" para repetir con otro video.

**Criterio de aceptación explícito:** este flujo debe completarse de punta a punta desde la navegación: arrastrar (1 acción) + Analizar (1 acción) = 2 acciones hasta el resultado.

### 8.2 Flujo crítico #2 — Grabar con la webcam y traducir
1. En Inicio, clic en "Grabar con la webcam" (o Espacio).
2. Acepta el permiso de cámara/micrófono; si se niega o no hay cámara, ve el mensaje claro y usa el camino de arrastrar.
3. Ve la cuenta regresiva; la grabación corta sola a los 10 s (o se detiene antes con Espacio; si dura < 2 s, se rechaza con mensaje).
4. Elige especie y tono, clic en "Analizar" → Analizando → Resultado (mismos pasos 6–8 del flujo 8.1). El resultado se guarda en historial.

### 8.3 Flujo — Revisar el historial
1. Clic en "Mis traducciones" en el encabezado (/historial).
2. Ve la grilla de tarjetas con miniatura, emoji, frase y fecha relativa.
3. Clic en una tarjeta → frase en grande, video si está guardado, opción de guardar imagen.
4. Borra una tarjeta o "Borrar todo" (con confirmación). Si está vacío, ve la guía "todavía no traduces nada: arrastra un video de tu mascota y vuelve".