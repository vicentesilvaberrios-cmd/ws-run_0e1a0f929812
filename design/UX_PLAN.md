# Plan de UX — "¿Qué Dice Mi Mascota?"

> Estándar aplicado: `app/globals.css` + `design/UX_GUIDELINES.md`. Tuteo chileno, cero tecnicismos en pantalla.

---

## Layout raíz — `app/layout.tsx`

- **Objetivo**: marco común (marca, navegación, honestidad) en todas las rutas.
- **Estructura**: `<header>` con `.navbar` → `<main class="container">` → `<footer>` con `.linea-honestidad`.
- **Componentes**: `Encabezado` (marca + NavLink "Mis traducciones") + `LineaHonestidad`.
- **Copy encabezado**: marca "**¿Qué Dice Mi Mascota?**"; enlace "**Mis traducciones**" (atributo `aria-label="Ver mis traducciones guardadas"`).
- **Copy pie**: "Esto es un juego, no ciencia real. Tu mascota te quiere igual aunque no le traduzcamos 🐾".
- **Atajos visibles al pie** (siempre): "Espacio: grabar · Enter: analizar".
- **Responsive**: navbar apila marca arriba / enlaces abajo en <640 px.
- **A11y**: `<header role="banner">`, `<main id="contenido">` con skip-link "Saltar al contenido", `<nav aria-label="Principal">`.

---

## Inicio / Carga — `app/page.tsx` (fase `inicio`)

- **Objetivo del usuario**: subir o grabar un video de su mascota y llegar al resultado.
- **Layout**: `.card` centrado, ancho máx 920 px; `stack` vertical con 3 bloques:
  1. Subtítulo de propósito (guía incorporada).
  2. Zona de video (drag & drop de toda la ventana).
  3. Selectores + botón Analizar.
- **Clases**: `.card`, `.field`, `.input`, `.btn`, `.btn-primary`, `.help-tip`, `.steps`, `.alert`, `.badge`.
- **Copy**.
  - H1: "**Traduce lo que dice tu mascota**".
  - Subtítulo: "Arrastra un video de tu perro o gato (máximo 1 minuto) y te diremos qué dice, su ánimo y por qué lo creemos.".
  - Zona drop (oculta cuando hay video): "**Arrastra aquí tu video** — o usa los botones de abajo.".
  - Zona drop (con video cargado): miniatura + nombre del archivo + duración + botón "Quitar".
  - Botones: "**Elegir un video**" (secundario `.btn-ghost`) · "**Grabar con la webcam**" (secundario `.btn-ghost`).
  - Especie (obligatoria): "**¿Quién es?**" con dos tarjetas clickeables (íconos 🐶 Perro / 🐱 Gato), la última elección queda marcada y recordada.
  - Tono: "**Tono de la traducción**" con chips "**Tierno**" (seleccionado por default) · "**Sarcástico**".
  - Botón primario: "**Analizar**" (disabled hasta video validado + especie elegida).
  - Estados webcam: "**Pidiendo permiso…**", "**Grabando · 0:08**" (cuenta regresiva), "**Grabación muy corta, graba al menos 2 segundos**".
  - Errores en `.alert-error`: "Ese archivo no es un video.", "Usa un video de menos de 1 minuto.", "No pudimos acceder a la cámara. Puedes arrastrar un video en su lugar.".
- **Mínimo esfuerzo**.
  - **Tarea principal / clics**: arrastrar video + clic "Analizar" = **2 clics** (o 0 con Enter).
  - **Defaults**: especie recordada de `localStorage` (si existe); tono "Tierno" preseleccionado. Con esos valores + un video arrastrado, basta 1 clic ("Analizar") para llegar al resultado.
  - **Acción única**: un solo `.btn-primary` ("Analizar"); el resto son `.btn-ghost`.
  - **Avanzado escondido**: opciones de webcam (elegir dispositivo, mirror) bajo toggle "**Mostrar opciones de cámara**" (no rompe el flujo).
  - **Pickers acotados**: selector de especie cerrado a 2 opciones (Perro/Gato); tono cerrado a 2.
  - **Atajos**: Espacio (grabar/parar webcam), Enter (analizar) — mostrados en el pie.
- **Guía incorporada**.
  - Subtítulo de propósito (arriba).
  - `.steps` breve cuando NO hay video cargado: 1) Sube o graba un video · 2) Elige si es perro o gato · 3) Pulsa Analizar.
  - `.help-tip` en la especie: "¿Tu mascota es un perro o un gato? Esto cambia cómo interpretamos sus señales.".
  - `.help-tip` en el tono: "Tierno: frases cariñosas. Sarcástico: frases con humor negro.".
  - Feedback al pegar/quitar archivo: "**Listo, video cargado · 0:08**".
- **Responsive**: en <640 px las tarjetas de especie se apilan en columna; el video cargado ocupa 100 %.
- **A11y**: dropzone con `role="button"` `tabindex="0"` y `aria-label="Zona para arrastrar tu video"`; mensajes de error con `aria-describedby`; webcam con `<video aria-label="Vista previa de tu cámara">`.

---

## Analizando — `app/page.tsx` (fase `analizando`)

- **Objetivo del usuario**: ver que la app está trabajando (espectáculo 2,5–4 s).
- **Layout**: overlay (`.card`) sobre fondo con `<video>` en `filter: blur(20px)`; lista vertical de 4 etapas.
- **Clases**: `.card`, `.steps` (reusado como lista de progreso con checkmark ✓), `.badge` por etapa activa.
- **Copy**.
  - H1: "**Estamos leyendo a tu mascota…**".
  - Subtítulo: "Esto toma solo unos segundos. No cierres esta ventana.".
  - Etapas (marcadas una a una, en orden):
    1. ✓ "**Detectando a tu mascota**".
    2. ✓ "**Midiendo nivel de energía**".
    3. ✓ "**Escuchando vocalizaciones**".
    4. ✓ "**Traduciendo al español**".
  - Cancelar (opcional): botón "**Detener**" (`.btn-ghost`) — no compite con la acción principal (no hay otra).
- **Mínimo esfuerzo**.
  - **Costo**: 0 clics (transición automática tras Analizar). Duración total garantizada 2,5–4 s (si el análisis termina antes, se rellena con las etapas).
  - Sin inputs del usuario: pantalla puramente informativa.
- **Guía incorporada**: las 4 etapas con sus verbos naturales explican el proceso sin jerga.
- **Responsive**: tarjeta centrada máx 480 px; tipografía escala a `.h2` en móvil.
- **A11y**: `role="status" aria-live="polite"` para anunciar "Etapa 2 de 4"; respeto a `prefers-reduced-motion` (sin parpadeo de checks, aparecen de una).

---

## Resultado — `app/page.tsx` (fase `resultado`)

- **Objetivo del usuario**: leer la frase, ver el ánimo, decidir qué hacer (copiar, guardar imagen, repetir).
- **Layout**: `.grid` 2 columnas ≥1024 px; apilado <1024 px.
  - **Izquierda**: video en `<video>` con `loop muted autoplay` + subtítulo superpuesto (estilo película: `.subtitle`).
  - **Derecha**: panel `.card` con `stack` vertical: ánimo (emoji grande + nombre), barrita de certeza, "Cómo llegué a esto", acciones, honestidad.
- **Clases**: `.grid`, `.grid-md-2`, `.card`, `.panel`, `.badge`, `.certainty-bar`, `.btn`, `.btn-primary`, `.btn-ghost`, `.linea-honestidad`.
- **Copy**.
  - H1: "**Tu mascota dice:**" (el subtítulo del video lleva la frase).
  - Subtítulo general: "Mira el video y revisa por qué llegamos a esta traducción.".
  - Subtítulo del video: la frase en primera persona (≤120 chars).
  - Ánimo: "**{emoji} {Nombre del ánimo}**" (ej. "🤪 En modo bobo").
  - Certeza: "**Certeza: 87 %**" + barrita con etiqueta accesible.
  - "**Cómo llegué a esto**" (panel `.panel`):
    - "Energía: mucho movimiento" / "poca" / "media".
    - "Voz: ladró 2 veces" / "sin audio en este video".
    - "Duración: 8 segundos".
  - Botones (en orden, un solo primario al final):
    - "**Copiar la frase**" (`.btn-ghost`, con feedback "¡Copiada!" durante 2 s).
    - "**Guardar imagen**" (`.btn-ghost`) → descarga PNG 1080×1080.
    - "**Otra traducción**" (`.btn-ghost`).
    - "**Cambiar tono**" (`.btn-ghost`).
    - "**Analizar otro video**" (`.btn-primary`, acción final del flujo).
  - Línea de honestidad: "Esto es un juego, no ciencia real.".
- **Mínimo esfuerzo**.
  - **Tarea principal / clics**: leer/guardar → **0–1 clic** (la acción más común es "Guardar imagen" = 1 clic; o solo mirar = 0).
  - **Acción única**: "**Analizar otro video**" es el único `.btn-primary` (transición al siguiente ciclo); el resto son `.btn-ghost` para no competir.
  - **Defaults**: ya quedó guardado en historial al llegar aquí (0 clics extra).
  - **Avanzado escondido**: atajos de teclado listados en `.help-tip` ("R: otra frase · T: cambiar tono · N: nuevo video").
  - **Opciones dependientes**: "Cambiar tono" recalcula al instante sin re-analizar; "Otra traducción" nunca repite la frase anterior (regla global).
  - **Atajos**: R (otra traducción), T (cambiar tono), N (analizar otro) — anunciados en tooltip del pie de la card derecha.
- **Guía incorporada**.
  - Subtítulo de propósito.
  - `.help-tip` en certeza: "Qué tan seguros estamos de este ánimo. Nunca es 100 % porque tu mascota sigue siendo un misterio.".
  - `.help-tip` en "Guardar imagen": "Descarga una imagen cuadrada lista para compartir.".
  - Confirmación legible tras copiar: "**¡Copiada!** La frase quedó en tu portapapeles." (auto).
- **Responsive**: <1024 px apila video arriba y panel abajo; el video pasa a 100 % y el subtítulo se mantiene legible; botones en grilla `.grid-sm-2`.
- **A11y**: video con `aria-label="Video de la mascota en loop silencioso"`; certeza con `role="meter" aria-valuenow aria-valuemin aria-valuemax`; feedback de copia anunciado vía `aria-live="polite"`.

---

## Historial — `app/historial/page.tsx`

- **Objetivo del usuario**: revisar traducciones pasadas, borrar o re-guardar.
- **Layout**: `.card` con `<h1>` + subtítulo + `.toolbar` (botón "**Borrar todo**" `.btn-danger`) + `.grid grid-md-3` de `TarjetaHistorial`.
- **Clases**: `.card`, `.toolbar`, `.grid`, `.grid-md-3`, `.empty-state`, `.btn-danger`.
- **Copy**.
  - H1: "**Mis traducciones**".
  - Subtítulo: "Aquí quedan todas las traducciones que hiciste. Puedes volver a verlas o guardarlas como imagen.".
  - Toolbar: "**Borrar todo**" (a la derecha, separado).
  - Tarjeta: miniatura + emoji · frase truncada · "hace 2 horas" · botón "**Borrar**" (ícono, `aria-label="Borrar esta traducción"`).
  - Empty state: "**Todavía no traduces nada**" + cuerpo "Arrastra un video de tu mascota en la página principal y vuelve aquí para ver tus traducciones." + botón "**Ir a traducir**" (link a `/`).
  - Modal `ConfirmarBorrado`: "**¿Borrar todas tus traducciones?**" + "Esta acción no se puede deshacer." + botones "**Cancelar**" / "**Sí, borrar todo**" (`.btn-danger`).
- **Mínimo esfuerzo**.
  - **Tarea principal / clics**: revisar traducción → **1 clic** (abrir tarjeta). Borrar todo → **2 clics** (botón + confirmación).
  - **Acción única**: borrar todo es el único `.btn-danger`; cada tarjeta tiene su botón propio (patrón consistente con la app).
  - **Avanzado escondido**: filtros (por especie, por ánimo) detrás de "**Mostrar filtros**" — no rompen el caso típico.
  - **Atajos**: en tarjeta, Enter abre detalle; en modal, Esc cancela.
- **Guía incorporada**.
  - Subtítulo de propósito.
  - `.help-tip` en "Borrar todo": "Elimina todas las traducciones de tu historial. No se puede deshacer.".
  - Empty state que enseña el primer paso (botón a `/`).
  - `.help-tip` en "Borrar" de tarjeta: "Saca esta traducción de tu historial.".
- **Responsive**: `.grid-md-3` → 2 columnas en 640–960 px → 1 columna en <640 px; tarjetas mantienen alto táctil.
- **A11y**: grilla navegable con flechas; modal con `role="dialog" aria-modal="true"`, foco atrapado, foco inicial en "Cancelar".

---

## Detalle de traducción — `DetalleTraduccion` (modal/pane en `/historial`)

- **Objetivo del usuario**: ver la frase en grande y, si está, el video guardado; re-guardar imagen.
- **Layout**: modal `.card` con `stack`: frase grande, video (si hay blob), acciones.
- **Clases**: `.card`, `.btn`, `.btn-ghost`, `.subtitle`.
- **Copy**.
  - H2: "**Tu mascota dice:**".
  - Frase grande (mismo subtítulo-estilo).
  - Si hay video: `<video controls>`; si no: "**El video ya no está guardado** — pero la traducción sigue aquí.".
  - Botones: "**Guardar imagen**" (`.btn-ghost`) · "**Cerrar**" (`.btn-primary`).
- **Mínimo esfuerzo**.
  - **Costo**: abrir = 1 clic; re-guardar imagen = 1 clic más.
  - **Acción única**: "Cerrar" es el único `.btn-primary`.
- **Guía incorporada**: subtítulo "Puedes volver a guardar esta traducción como imagen.".
- **Responsive**: modal full-width <640 px; video 100 %.
- **A11y**: `role="dialog"`, foco atrapado, Esc cierra, `aria-label="Detalle de la traducción"`.

---

## Reglas transversales (consistencia)

- **Botones primarios**: siempre `.btn-primary`, uno por pantalla (Analizar / Analizar otro video / Cerrar / según contexto).
- **Subtítulos de propósito**: toda pantalla con `<h1>` lleva un subtítulo de una línea que explica el "para qué".
- **Estados**: cargando con texto "Cargando…"; vacío con `.empty-state` y guía del primer paso; error con `.alert-error` accionable; éxito con feedback breve.
- **Color de estado**: badges de ánimo usan el mismo mapa en resultado, historial y detalle.
- **Honestidad**: `LineaHonestidad` visible en el pie de todas las páginas; repetida dentro del resultado.
- **Tipografía**: fuente del sistema, escala móvil→escritorio; h1 ~2 rem, h2 ~1.5 rem.
- **Sin jerga**: nunca "CRUD", "endpoint", "payload", "submit", "ID". Botones = verbo del dominio: "Analizar", "Guardar imagen", "Borrar todo", "Cerrar", "Copiar la frase".