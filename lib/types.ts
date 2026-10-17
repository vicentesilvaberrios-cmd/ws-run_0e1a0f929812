// Tipos compartidos para el motor de "traducción" de mascotas.
// Toda la lógica del cliente opera con estas estructuras; la UI solo
// conoce las 3 funciones de `lib/analisis.ts` que las producen.

/** Especies soportadas por la app. */
export type Especie = "perro" | "gato";

/** Tono narrativo de la frase. */
export type Tono = "tierno" | "sarcastico";

/** Estados de ánimo detectables (4 ánimos × 2 especies × 2 tonos = 16 grupos). */
export type EstadoAnimo =
  | "jugueton"     // mucha energía
  | "tranquilo"    // quieto y silencioso
  | "hambriento"   // energía media + vocalizaciones reiteradas
  | "curioso"      // energía media, sin audio claro
  | "asustado"     // energía alta + picos sonoros agudos
  | "enojado";     // energía alta + vocalizaciones fuertes

/** Etapas visibles del análisis (Épica 2, 4 etapas). */
export type EtapaAnalisis =
  | "detectando"
  | "energia"
  | "escuchando"
  | "traduciendo";

/** Señales crudas que el motor extrae del video. */
export interface Señales {
  /** Energía de movimiento, 0–100. */
  energia: number;
  /** Nivel de pico del audio, 0–100. */
  pico: number;
  /** RMS (energía promedio) del audio, 0–100. */
  rms: number;
  /** Número de eventos sonoros discretos (ladridos/maullidos). */
  eventos: number;
  /** Indica si el video trae pista de audio con señal útil. */
  tieneAudio: boolean;
  /** Duración del video en segundos. */
  duracion: number;
}

/** Resultado combinado del análisis: ánimo + certeza 0–100. */
export interface AnalisisCompleto {
  animo: EstadoAnimo;
  certeza: number;
  señales: Señales;
  especie: Especie;
}

/** Etiqueta legible y emoji del estado de ánimo. */
export interface EtiquetaAnimo {
  nombre: string;
  emoji: string;
}

/** Datos persistidos en el historial (IndexedDB). */
export interface DatosHistorial {
  id?: number;
  frase: string;
  animo: EstadoAnimo;
  certeza: number;
  especie: Especie;
  tono: Tono;
  /** Marca de tiempo de creación (epoch ms). */
  creadoEn: number;
  /** Miniatura JPEG/PNG del primer frame, ≤ 40 KB. */
  miniatura: Blob;
  /** Blob del video (opcional; solo se conservan los últimos 10). */
  video?: Blob;
  /** Duración del video en segundos. */
  duracion: number;
  /** Resumen de las señales medidas (para "Cómo llegué a esto" sin reabrir el blob). */
  señales: Señales;
}