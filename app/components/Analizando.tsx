"use client";

import { useEffect, useRef, useState } from "react";
import type { EtapaAnalisis } from "../../lib/types";

interface Props {
  /** URL del blob del video (para usar como fondo con blur). */
  videoUrl: string;
  /** Callback para detener el análisis manualmente (opcional). */
  onCancelar?: () => void;
}

const ETAPAS: { id: EtapaAnalisis; texto: string }[] = [
  { id: "detectando", texto: "Detectando a tu mascota" },
  { id: "energia",    texto: "Midiendo nivel de energía" },
  { id: "escuchando", texto: "Escuchando vocalizaciones" },
  { id: "traduciendo",texto: "Traduciendo al español" },
];

const MIN_MS = 2500;
const MAX_MS = 4000;

export default function Analizando({ videoUrl, onCancelar }: Props) {
  const [indiceEtapa, setIndiceEtapa] = useState(0);
  const [fondo, setFondo] = useState<string | null>(null);
  const canceladoRef = useRef(false);

  // Capturar un frame del video para usarlo de fondo con blur
  useEffect(() => {
    let vivo = true;
    const v = document.createElement("video");
    v.src = videoUrl;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const onMeta = async () => {
      try {
        v.currentTime = Math.min(0.1, (v.duration || 1) * 0.05);
      } catch { /* noop */ }
    };
    const onSeeked = () => {
      if (!vivo) return;
      try {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 360;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          setFondo(c.toDataURL("image/jpeg", 0.7));
        }
      } catch { /* noop */ }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", onSeeked);
    return () => {
      vivo = false;
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [videoUrl]);

  // Avance de etapas y duración mínima/máxima (AC2.1: 2.5–4s con las 4
  // etapas marcadas, aunque el motor termine antes — el padre ya bloquea
  // la transición a resultado, aquí solo garantizamos el orden visual).
  useEffect(() => {
    canceladoRef.current = false;
    const t0 = performance.now();
    // Distribuir las 4 etapas en toda la ventana [0, MAX_MS] para que
    // se vean "una a una" como pide la spec (F2.1) y todas queden
    // marcadas al llegar al mínimo de 2.5s.
    const duracionVisible = MAX_MS;
    const tiempoPorEtapa = Math.floor(duracionVisible / ETAPAS.length);
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < ETAPAS.length; i++) {
      timers.push(
        setTimeout(() => {
          if (!canceladoRef.current) setIndiceEtapa(i);
        }, i * tiempoPorEtapa),
      );
    }

    // Watchdog: si por alguna razón no se dispararon los timers (p.ej.
    // pestaña en background), marcar todas al pasar MIN_MS y cortar al
    // pasar MAX_MS.
    const watchdog = setInterval(() => {
      const elapsed = performance.now() - t0;
      if (elapsed >= MIN_MS) {
        setIndiceEtapa(ETAPAS.length);
      }
      if (elapsed >= MAX_MS) {
        clearInterval(watchdog);
      }
    }, 200);

    return () => {
      canceladoRef.current = true;
      timers.forEach(clearTimeout);
      clearInterval(watchdog);
    };
  }, []);

  return (
    <div className="analisis-wrap fade-in" role="status" aria-live="polite">
      <div
        className="analisis-fondo"
        aria-hidden="true"
        style={fondo ? { backgroundImage: `url(${fondo})` } : undefined}
      />
      <div className="analisis-card">
        <h1>Estamos leyendo a tu mascota…</h1>
        <p className="subtitle mt-2">
          Esto toma solo unos segundos. No cierres esta ventana.
        </p>

        <div className="stack mt-4" role="list">
          {ETAPAS.map((e, i) => {
            const isDone = i < indiceEtapa;
            const isActive = i === indiceEtapa;
            return (
              <div
                key={e.id}
                role="listitem"
                className={
                  "etapa" +
                  (isActive ? " is-active" : "") +
                  (isDone ? " is-done" : "")
                }
                aria-current={isActive ? "step" : undefined}
              >
                <span className="check" aria-hidden="true">
                  {isDone ? "✓" : isActive ? "•" : ""}
                </span>
                <span>{e.texto}</span>
              </div>
            );
          })}
        </div>

        {onCancelar && (
          <div className="cluster mt-4" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCancelar}
            >
              Detener
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
