// Utilidades de video: captura de frames, duración y canvas PNG 1080.

const MIN_SEG = 2;
const MAX_SEG = 60;

/**
 * Verifica la duración de un archivo de video. Si no es un tipo de video
 * conocido, lanza Error con mensaje claro para la UI.
 */
export async function verificarDuracion(file: File): Promise<number> {
  if (!file || !file.type.startsWith("video/")) {
    throw new Error("ese archivo no es un video");
  }
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.src = url;
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error("no se pudo leer el video")); };
      const cleanup = () => {
        v.removeEventListener("loadedmetadata", ok);
        v.removeEventListener("error", bad);
      };
      v.addEventListener("loadedmetadata", ok);
      v.addEventListener("error", bad);
    });

    const d = v.duration;
    if (!isFinite(d) || d <= 0) {
      throw new Error("no se pudo leer la duración");
    }
    if (d < MIN_SEG) {
      throw new Error("el video es muy corto (mínimo 2 segundos)");
    }
    if (d > MAX_SEG) {
      throw new Error("usa un video de menos de 1 minuto");
    }
    return d;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Captura un frame del video en el tiempo dado y lo devuelve como Blob PNG.
 * Pensado para generar miniaturas del historial (típicamente < 40 KB).
 */
export async function capturarFrame(
  fuente: string | HTMLVideoElement,
  tiempoSeg: number,
  ancho: number = 320,
  alto: number = 240,
  tipo: "image/png" | "image/jpeg" = "image/jpeg",
  calidad?: number,
): Promise<Blob> {
  const ownVideo = typeof fuente === "string";
  const video: HTMLVideoElement = ownVideo
    ? document.createElement("video")
    : (fuente as HTMLVideoElement);

  if (ownVideo) {
    (video as HTMLVideoElement).src = fuente as string;
    (video as HTMLVideoElement).crossOrigin = "anonymous";
    (video as HTMLVideoElement).muted = true;
    (video as HTMLVideoElement).playsInline = true;
    (video as HTMLVideoElement).preload = "auto";

    await new Promise<void>((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error("no se pudo cargar el video")); };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", ok);
        video.removeEventListener("error", bad);
      };
      video.addEventListener("loadedmetadata", ok);
      video.addEventListener("error", bad);
    });
  }

  await seek(video, tiempoSeg);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.drawImage(video, 0, 0, ancho, alto);

  const blob = await canvasToBlob(canvas, tipo, calidad);
  if (!blob) throw new Error("No se pudo generar la miniatura");

  if (ownVideo && (video.src as string).startsWith("blob:")) {
    URL.revokeObjectURL(video.src);
  }
  return blob;
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const f = () => {
      v.removeEventListener("seeked", f);
      resolve();
    };
    v.addEventListener("seeked", f);
    try {
      v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.05));
    } catch {
      resolve();
    }
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
  calidad?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), tipo, calidad);
  });
}

/**
 * Genera un PNG 1080×1080 con frame + frase + ánimo + especie + branding.
 * Devuelve Blob PNG listo para descargar.
 */
export async function generarCanvas1080(
  frame: Blob | HTMLImageElement,
  frase: string,
  animo: string,
  especie: Especie,
  appNombre: string = "¿Qué Dice Mi Mascota?",
): Promise<Blob> {
  const img = frame instanceof Blob ? await blobToImage(frame) : frame;

  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // Fondo negro suave
  ctx.fillStyle = "#0f1318";
  ctx.fillRect(0, 0, size, size);

  // Frame centrado, manteniendo proporción y cubriendo
  const draw = coverImage(ctx, img, size);
  // (no usamos el resultado, solo queremos el efecto de cover)

  // Viñeta inferior semitransparente para el subtítulo
  const grad = ctx.createLinearGradient(0, size * 0.55, 0, size);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, size * 0.55, size, size * 0.45);

  // Subtítulo: la frase en grande
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const fraseSize = fitTextSize(ctx, frase, size - 120, 72);
  ctx.font = `700 ${fraseSize}px ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif`;

  // Sombra para contraste
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  // Salto de línea manual si hace falta (palabras)
  const lineas = wrap(ctx, frase, size - 120);
  let y = size - 110;
  for (let i = lineas.length - 1; i >= 0; i--) {
    ctx.fillText(lineas[i], size / 2, y);
    y -= fraseSize * 1.2;
  }

  // Reset sombra para el resto
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Etiqueta de ánimo + especie (chip arriba a la izquierda)
  const chipTxt = `${animo} · ${especie === "perro" ? "Perro" : "Gato"}`;
  ctx.font = `600 28px ui-sans-serif, system-ui, sans-serif`;
  const padX = 18;
  const padY = 12;
  const w = ctx.measureText(chipTxt).width + padX * 2;
  const h = 28 + padY * 2;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, 28, 28, w, h, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(chipTxt, 28 + padX, 28 + h / 2);

  // Branding abajo a la derecha
  ctx.font = `500 22px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(appNombre, size - 28, size - 28);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("No se pudo generar el PNG"));
    }, "image/png");
  });

  // (referencias para evitar warning de "declared but never used" en strict)
  void draw;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo cargar el frame")); };
    img.src = url;
  });
}

function coverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const ratio = Math.max(size / img.width, size / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ajusta tamaño de fuente para que el texto quepa en maxWidth y no pase de maxSize. */
function fitTextSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
): number {
  let size = maxSize;
  ctx.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
  }
  return size;
}

/** Salto de línea por palabras que caben en maxWidth. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const palabras = text.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? actual + " " + p : p;
    if (ctx.measureText(prueba).width > maxWidth && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  // máximo 3 líneas para que entre en el canvas
  if (lineas.length > 3) {
    const truncadas = lineas.slice(0, 3);
    let last = truncadas[2];
    while (ctx.measureText(last + "…").width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    truncadas[2] = last + "…";
    return truncadas;
  }
  return lineas;
}

import type { Especie } from "./types";