"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AnalisisCompleto,
  DatosHistorial,
  Tono,
} from "../../lib/types";
import { ETIQUETAS } from "../../lib/frases";
import { elegirFrase, semillaDe } from "../../lib/analisis";
import { capturarFrame, generarCanvas1080 } from "../../lib/video";
import { HistorialDB } from "../../lib/historial";

interface Props {
  /** Video que se está mostrando en loop. */
  videoUrl: string;
  /** Blob original del video (para re-guardar imagen / historial). */
  videoBlob: Blob;
  /** Resultado del análisis (ánimo, certeza, señales, especie). */
  resultado: AnalisisCompleto;
  /** Tono seleccionado. */
  tono: Tono;
  onTonoChange: (t: Tono) => void;
  /** Callback para repetir análisis con otro video. */
  onAnalizarOtro: () => void;
}

const CERTEZA_MIN = 72;
const CERTEZA_MAX = 96;

export default function Resultado({
  videoUrl,
  videoBlob,
  resultado,
  tono,
  onTonoChange,
  onAnalizarOtro,
}: Props) {
  const { animo, certeza, señales, especie } = resultado;
  const etiqueta = ETIQUETAS[animo];

  const semilla = useMemo(
    () =>
      semillaDe(
        señales.duracion,
        señales.energia,
        señales.pico,
        señales.rms,
        señales.eventos,
        especie,
        tono,
      ),
    [señales, especie, tono],
  );

  // Mapear certeza del motor (60–99) al rango visible (72–96)
  const certezaVisible = (() => {
    const t = (certeza - 60) / (99 - 60);
    const v = CERTEZA_MIN + t * (CERTEZA_MAX - CERTEZA_MIN);
    return Math.round(Math.max(CERTEZA_MIN, Math.min(CERTEZA_MAX, v)));
  })();

  // Selección de frase: AC3.4 — la primera frase y todas las siguientes
  // (R) NUNCA repiten la inmediatamente anterior. Por eso elegimos la
  // primera con `indice=0` pasando `ultimoId = -1` (id imposible, así no
  // se autobloquea) y registramos su id real como estado inicial para
  // que la siguiente llamada (R, o el useEffect de cambio de tono) ya
  // tenga referencia y NO devuelva la misma frase.
  const seleccionInicial = useMemo(
    () => elegirFrase(animo, especie, tono, semilla, 0, -1),
    [animo, especie, tono, semilla],
  );
  const [indiceFrase, setIndiceFrase] = useState(0);
  const [ultimoId, setUltimoId] = useState<number | null>(seleccionInicial.id);
  const [frase, setFrase] = useState<string>(seleccionInicial.frase);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Cuando cambia el tono, recalcular la frase al instante SIN repetir la
  // última frase mostrada (mismo indice → no repetir).
  useEffect(() => {
    const r = elegirFrase(animo, especie, tono, semilla, indiceFrase, ultimoId ?? undefined);
    setFrase(r.frase);
    setUltimoId(r.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tono]);

  // Guardar en historial la primera vez que se llega al resultado
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const miniatura = await capturarFrame(videoUrl, 0.1, 320, 200, "image/jpeg", 0.8);
        const registro: Omit<DatosHistorial, "id"> = {
          frase,
          animo,
          certeza: certezaVisible,
          especie,
          tono,
          creadoEn: Date.now(),
          miniatura,
          video: videoBlob,
          duracion: señales.duracion,
          señales,
        };
        if (vivo) {
          await HistorialDB.guardar(registro);
        }
      } catch {
        // si falla la miniatura, no rompemos el resultado
      }
    })();
    return () => { vivo = false; };
    // Solo se ejecuta una vez al llegar al resultado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const otraTraduccion = useCallback(() => {
    setIndiceFrase((i) => {
      const nuevo = i + 1;
      // Pasamos ultimoId para garantizar que la nueva frase NO sea la misma
      // que la anterior (AC3.4).
      const r = elegirFrase(animo, especie, tono, semilla, nuevo, ultimoId ?? undefined);
      setFrase(r.frase);
      setUltimoId(r.id);
      return nuevo;
    });
  }, [animo, especie, tono, semilla, ultimoId]);

  const copiar = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(frase);
      } else {
        // Fallback para navegadores sin Clipboard API
        const ta = document.createElement("textarea");
        ta.value = frase;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setFeedback("¡Copiada! La frase quedó en tu portapapeles.");
      setTimeout(() => setFeedback(null), 2200);
    } catch {
      setFeedback("No pudimos copiar. Selecciona y copia manualmente.");
      setTimeout(() => setFeedback(null), 2400);
    }
  }, [frase]);

  const guardarImagen = useCallback(async () => {
    try {
      const frame = await capturarFrame(videoUrl, 0.1, 720, 540, "image/jpeg", 0.85);
      const blob = await generarCanvas1080(frame, frase, etiqueta.nombre, especie);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mascota-${animo}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFeedback("No pudimos guardar la imagen. Intenta de nuevo.");
      setTimeout(() => setFeedback(null), 2400);
    }
  }, [videoUrl, frase, etiqueta.nombre, especie, animo]);

  // Atajos: R (otra), T (cambiar tono), N (otro video)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const enEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (enEditable) return;
      const k = e.key.toLowerCase();
      if (k === "r") {
        e.preventDefault();
        otraTraduccion();
      } else if (k === "t") {
        e.preventDefault();
        onTonoChange(tono === "tierno" ? "sarcastico" : "tierno");
      } else if (k === "n") {
        e.preventDefault();
        onAnalizarOtro();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [otraTraduccion, onTonoChange, onAnalizarOtro, tono]);

  // Descripciones legibles de las señales
  const energiaTxt = usoEnergia(señales.energia);
  const vozTxt = usoVoz(señales);
  const duracionTxt = usoDuracion(señales.duracion);

  return (
    <section className="fade-up" aria-label="Resultado de la traducción">
      <div className="grid-resultado">
        {/* Columna izquierda: video + subtítulo */}
        <div>
          <div className="video-frame">
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              aria-label="Video de la mascota en loop silencioso"
            />
            <div className="subtitle" key={frase}>
              {frase}
            </div>
          </div>
          <p className="text-sm muted mt-3">
            Reproducción en loop silencioso. Toca el video para controlarlo.
          </p>
        </div>

        {/* Columna derecha: panel */}
        <div className="card stack">
          <div className="animo">
            <span className="emoji" aria-hidden="true">{etiqueta.emoji}</span>
            <div className="texto">
              <span className="nombre">{etiqueta.nombre}</span>
              <span className="especie">
                {especie === "perro" ? "Perro" : "Gato"} · Tono{" "}
                {tono === "tierno" ? "tierno" : "sarcástico"}
              </span>
            </div>
          </div>

          <div className="certeza">
            <div className="fila">
              <span>
                Certeza
                <span
                  className="help-tip"
                  tabIndex={0}
                  role="note"
                  aria-label="Qué tan seguros estamos de este ánimo. Nunca es 100% porque tu mascota sigue siendo un misterio."
                  data-tip="Qué tan seguros estamos de este ánimo. Nunca es 100% porque tu mascota sigue siendo un misterio."
                >?</span>
              </span>
              <span
                className="valor"
                role="meter"
                aria-valuenow={certezaVisible}
                aria-valuemin={CERTEZA_MIN}
                aria-valuemax={CERTEZA_MAX}
                aria-label={`Certeza ${certezaVisible}%`}
              >
                {certezaVisible}%
              </span>
            </div>
            <div className="barra-certeza" aria-hidden="true">
              <div
                className="relleno"
                style={{ width: `${((certezaVisible - CERTEZA_MIN) / (CERTEZA_MAX - CERTEZA_MIN)) * 100}%` }}
              />
            </div>
          </div>

          <div className="como-llegue">
            <h3>Cómo llegué a esto</h3>
            <div className="filas">
              <div className="fila">
                <strong>Energía</strong>
                <span>{energiaTxt}</span>
              </div>
              <div className="fila">
                <strong>Voz</strong>
                <span>{vozTxt}</span>
              </div>
              <div className="fila">
                <strong>Duración</strong>
                <span>{duracionTxt}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="stack">
            <div className="grid grid-sm-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={copiar}
              >
                📋 Copiar la frase
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={guardarImagen}
              >
                🖼️ Guardar imagen
                <span
                  className="help-tip"
                  tabIndex={0}
                  role="note"
                  aria-label="Descarga una imagen cuadrada lista para compartir."
                  data-tip="Descarga una imagen cuadrada lista para compartir."
                >?</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={otraTraduccion}
                title="Atajo: R"
              >
                🎲 Otra traducción
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onTonoChange(tono === "tierno" ? "sarcastico" : "tierno")}
                title="Atajo: T"
              >
                🎭 Cambiar tono
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={onAnalizarOtro}
              title="Atajo: N"
            >
              🔄 Analizar otro video
            </button>
          </div>

          <div className="cluster" aria-hidden="false">
            <span className="honesto-tag">🎈 Esto es un juego, no ciencia real</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="feedback-vivo" role="status" aria-live="polite">
          {feedback}
        </div>
      )}
    </section>
  );
}

// Helpers de descripción humana
function usoEnergia(e: number): string {
  if (e >= 60) return "Mucho movimiento";
  if (e >= 30) return "Movimiento moderado";
  if (e > 5)   return "Poco movimiento";
  return "Casi quieto";
}

function usoVoz(s: { tieneAudio: boolean; eventos: number; rms: number }): string {
  if (!s.tieneAudio || s.rms < 1) return "Sin audio en este video";
  if (s.eventos === 0)            return "Sin vocalizaciones claras";
  if (s.eventos === 1)            return "Hizo un sonido";
  if (s.eventos === 2)            return "Hizo 2 sonidos";
  return `Hizo ${s.eventos} sonidos`;
}

function usoDuracion(d: number): string {
  const s = Math.round(d);
  if (s <= 1)   return "1 segundo";
  if (s < 60)   return `${s} segundos`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} minuto${m > 1 ? "s" : ""}` : `${m} min ${r} s`;
}
