// Motor determinista de "traducción" de mascotas.
// La UI consume SOLO estas 3 funciones; reemplazar este archivo
// (p. ej. por un modelo local) no toca ninguna pantalla.

import type { Especie, EstadoAnimo, Señales, Tono } from "./types";
import { FRASES } from "./frases";

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Hash determinista (FNV-1a 32) sobre un string. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG sembrado por un entero 32-bit. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Redondeo a entero seguro para hashing. */
function q(n: number): number {
  return Math.round(n * 1000);
}

// ---------------------------------------------------------------------------
// Análisis de video (energía + audio + duración)
// ---------------------------------------------------------------------------

export interface FuenteVideo {
  /** URL o blob URL del video a analizar. */
  src: string;
}

/**
 * Extrae señales de un video: energía de movimiento, métricas de audio y
 * duración. Determina: ≥ ~10 frames repartidos sobre la duración, canvas
 * 160x120, diferencia media de píxeles en grises entre frames consecutivos
 * (energía normalizada 0-100). Audio: AudioContext.decodeAudioData,
 * pico y RMS normalizados 0-100, y eventos sonoros = picos sobre umbral
 * separados por ≥ 300 ms.
 */
export async function analizarVideo(fuente: FuenteVideo): Promise<Señales> {
  const video = document.createElement("video");
  video.src = fuente.src;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error("No se pudo cargar el video"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", ok);
      video.removeEventListener("error", bad);
    };
    video.addEventListener("loadedmetadata", ok);
    video.addEventListener("error", bad);
  });

  const duracion = isFinite(video.duration) ? video.duration : 0;

  // ----- Energía de movimiento -----
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const imgData = ctx.createImageData(160, 120);

  const frames = 10;
  const muestras: number[] = [];
  let prev: Uint8ClampedArray | null = null;

  for (let i = 0; i < frames; i++) {
    const t = duracion > 0 ? (i / (frames - 1)) * duracion * 0.95 : 0;
    seek(video, t);
    await new Promise<void>((r) => {
      const f = () => {
        video.removeEventListener("seeked", f);
        r();
      };
      video.addEventListener("seeked", f);
    });

    ctx.drawImage(video, 0, 0, 160, 120);
    const cur = ctx.getImageData(0, 0, 160, 120).data;
    // Convertir a grises una sola vez por frame
    const gris = imgData.data; // reutilizamos el buffer
    for (let p = 0, j = 0; p < cur.length; p += 4, j++) {
      const y = (0.299 * cur[p] + 0.587 * cur[p + 1] + 0.114 * cur[p + 2]) | 0;
      gris[j] = y;
    }
    if (prev) {
      let suma = 0;
      for (let j = 0; j < gris.length; j++) {
        suma += Math.abs(gris[j] - prev[j]);
      }
      // diff media 0..255 -> normalizar a 0..100
      muestras.push((suma / gris.length) * (100 / 255));
    }
    prev = new Uint8ClampedArray(gris); // copia para el siguiente frame
  }

  // Energia: promedio (más estable) + leve sesgo al percentil 75 (peaks)
  const energia = promedio(muestras) * 0.7 + percentil(muestras, 0.75) * 0.3;

  // ----- Audio -----
  const señalesAudio = await analizarAudio(fuente.src);

  // Liberar object URL si era blob
  if (fuente.src.startsWith("blob:")) {
    URL.revokeObjectURL(fuente.src);
  }

  return {
    energia: clamp(energia, 0, 100),
    pico: clamp(señalesAudio.pico, 0, 100),
    rms: clamp(señalesAudio.rms, 0, 100),
    eventos: señalesAudio.eventos,
    tieneAudio: señalesAudio.tieneAudio,
    duracion,
  };
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      v.removeEventListener("seeked", onSeeked);
      resolve();
    };
    v.addEventListener("seeked", onSeeked);
    try {
      v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.05));
    } catch {
      // algunos navegadores pueden lanzar si el metadata aún no está listo
      resolve();
    }
  });
}

interface AudioSenales {
  pico: number;
  rms: number;
  eventos: number;
  tieneAudio: boolean;
}

async function analizarAudio(src: string): Promise<AudioSenales> {
  try {
    const resp = await fetch(src);
    const buf = await resp.arrayBuffer();
    if (!buf.byteLength) return audioVacio();

    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return audioVacio();
    const ctx = new Ctor();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(buf.slice(0));
    } catch {
      try { decoded = await ctx.decodeAudioData(buf); } catch { return audioVacio(); }
    }
    ctx.close?.();

    if (!decoded || decoded.numberOfChannels === 0 || decoded.length === 0) {
      return audioVacio();
    }

    // Mezcla mono simple
    const len = decoded.length;
    const mono = new Float32Array(len);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < len; i++) mono[i] += data[i];
    }
    for (let i = 0; i < len; i++) mono[i] /= decoded.numberOfChannels;

    let picoAbs = 0;
    let sqSum = 0;
    for (let i = 0; i < len; i++) {
      const v = mono[i];
      const a = Math.abs(v);
      if (a > picoAbs) picoAbs = a;
      sqSum += v * v;
    }
    const rms = Math.sqrt(sqSum / len);

    // Pico y RMS normalizados a 0..100 (referencia: voz típica ~0.1-0.3 RMS)
    const picoN = Math.min(100, picoAbs * 100 * 2.5);
    const rmsN = Math.min(100, rms * 100 * 5);

    // Eventos: picos sobre umbral, separados ≥ 300 ms
    const sampleRate = decoded.sampleRate;
    const minGap = Math.floor(sampleRate * 0.3);
    const umbral = Math.max(rms * 3, picoAbs * 0.35, 0.08);
    let eventos = 0;
    let lastIdx = -minGap;
    for (let i = 0; i < len; i++) {
      if (Math.abs(mono[i]) > umbral && i - lastIdx >= minGap) {
        eventos++;
        lastIdx = i;
      }
    }

    return {
      pico: picoN,
      rms: rmsN,
      eventos,
      tieneAudio: picoAbs > 0.01,
    };
  } catch {
    return audioVacio();
  }
}

function audioVacio(): AudioSenales {
  return { pico: 0, rms: 0, eventos: 0, tieneAudio: false };
}

function promedio(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function percentil(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const sorted = xs.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ---------------------------------------------------------------------------
// Clasificación
// ---------------------------------------------------------------------------

type Nivel = "bajo" | "medio" | "alto";

function nivelEnergia(e: number): Nivel {
  if (e < 30) return "bajo";
  if (e < 60) return "medio";
  return "alto";
}
function nivelVoz(s: Señales): Nivel {
  if (!s.tieneAudio) return "bajo";
  if (s.rms < 25 && s.pico < 45) return "bajo";
  if (s.rms < 55 && s.pico < 75) return "medio";
  return "alto";
}

interface Matriz {
  // [nivelEnergia][nivelVoz] -> EstadoAnimo
  celdas: Record<Nivel, Record<Nivel, EstadoAnimo>>;
}

const MATRIZ: Record<Especie, Matriz> = {
  perro: {
    celdas: {
      alto: { bajo: "asustado", medio: "jugueton", alto: "enojado" },
      medio: { bajo: "curioso", medio: "hambriento", alto: "enojado" },
      bajo: { bajo: "tranquilo", medio: "hambriento", alto: "curioso" },
    },
  },
  gato: {
    celdas: {
      alto: { bajo: "asustado", medio: "jugueton", alto: "asustado" },
      medio: { bajo: "curioso", medio: "hambriento", alto: "enojado" },
      bajo: { bajo: "tranquilo", medio: "hambriento", alto: "curioso" },
    },
  },
};

/**
 * Clasifica ánimo y certeza (0-100, mapeada luego a 72-96 en UI) a partir
 * de las señales. Determinista: misma entrada => misma salida.
 */
export function clasificar(
  señales: Señales,
  especie: Especie,
): { animo: EstadoAnimo; certeza: number } {
  const ne = nivelEnergia(señales.energia);
  const nv = nivelVoz(señales);
  const animo = MATRIZ[especie].celdas[ne][nv];

  // Certeza: combinación determinista de las señales.
  // Rango aproximado 60-99 (UI recortará a 72-96).
  const base = 70;
  const sep = Math.abs(señales.energia - 50) / 50; // 0..1
  const confVoz = señales.tieneAudio
    ? Math.abs(señales.rms - 50) / 50
    : 0.4; // sin audio, confianza media
  const eventos = Math.min(1, señales.eventos / 4);
  const cert =
    base +
    sep * 12 +
    confVoz * 10 +
    eventos * 6 -
    (Math.abs(señales.duracion - 15) > 30 ? 6 : 0);

  return {
    animo,
    certeza: Math.round(clamp(cert, 60, 99)),
  };
}

// ---------------------------------------------------------------------------
// Selección de frase (sin repetir la anterior)
// ---------------------------------------------------------------------------

/**
 * Elige una frase del banco para (animo, especie, tono). El índice inicial
 * se deriva de la semilla (=> determinismo: misma semilla + mismo índice =>
 * misma frase). Al avanzar `indice`, evita repetir la anterior.
 * Si se agotan los elementos, reinicia saltando la última.
 */
export function elegirFrase(
  animo: EstadoAnimo,
  especie: Especie,
  tono: Tono,
  semilla: number | string,
  indice: number,
  ultimoId?: number, // id interno de la frase elegida la vez anterior (opcional)
): string {
  const grupo = FRASES[animo]?.[especie]?.[tono];
  if (!grupo || grupo.length === 0) {
    return "No tengo palabras, pero te quiero igual.";
  }

  const seedNum =
    typeof semilla === "number"
      ? semilla >>> 0
      : fnv1a(String(semilla));

  const rand = mulberry32(seedNum);
  // descartar 1 valor para que la semilla tenga efecto visible
  rand();

  const n = grupo.length;
  // inicio determinista (en [0, n))
  const inicio = Math.floor(rand() * n);
  const paso = (rand() * (n - 1) + 1) | 0; // paso coprimo-ish

  // Construimos la secuencia cíclica sin repetir ultimoId (si lo conocemos).
  // Recorremos como máximo n saltos; si nos pasamos, "reiniciamos saltando la última".
  let i = inicio;
  let intentos = 0;
  let lastChosenId: number | null = ultimoId ?? null;
  while (intentos < n) {
    const candidatoId = i;
    if (candidatoId !== lastChosenId) {
      return grupo[i];
    }
    i = (i + paso) % n;
    intentos++;
  }

  // Si todo el ciclo era el mismo id (grupo de tamaño 1), devolver el único.
  if (n === 1) return grupo[0];

  // Reinicio: empezar en `indice % n`, saltar el último id.
  const start = Math.abs(indice) % n;
  for (let k = 0; k < n; k++) {
    const j = (start + k) % n;
    if (j !== lastChosenId) return grupo[j];
  }
  return grupo[0];
}

/** Construye una semilla estable para identificar una (fuente+especie+tono). */
export function semillaDe(
  duracion: number,
  energia: number,
  pico: number,
  rms: number,
  eventos: number,
  especie: Especie,
  tono: Tono,
): number {
  const s = `${q(duracion)}|${q(energia)}|${q(pico)}|${q(rms)}|${eventos}|${especie}|${tono}`;
  return fnv1a(s);
}