"use client";

import { useEffect, useRef, useState } from "react";
import type { DatosHistorial, Especie } from "../../lib/types";
import { ETIQUETAS } from "../../lib/frases";
import { capturarFrame, generarCanvas1080 } from "../../lib/video";

interface Props {
  registro: DatosHistorial;
  onCerrar: () => void;
}

export default function DetalleTraduccion({ registro, onCerrar }: Props) {
  const etiqueta = ETIQUETAS[registro.animo];
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!registro.video) return;
    const url = URL.createObjectURL(registro.video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [registro.video]);

  // Foco inicial en el botón "Cerrar" (acción segura) y manejo de Esc
  useEffect(() => {
    cerrarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCerrar();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  // Atrapa foco básico dentro del modal
  useEffect(() => {
    const modal = document.getElementById("modal-detalle");
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const guardarImagen = async () => {
    try {
      let frameBlob: Blob;
      if (registro.video) {
        // Tomamos un frame del video guardado si está disponible
        const v = document.createElement("video");
        const u = URL.createObjectURL(registro.video);
        v.src = u; v.muted = true; v.playsInline = true;
        await new Promise<void>((res, rej) => {
          v.addEventListener("loadedmetadata", () => res(), { once: true });
          v.addEventListener("error", () => rej(new Error("no video")), { once: true });
        });
        v.currentTime = 0.1;
        await new Promise<void>((res) => {
          v.addEventListener("seeked", () => res(), { once: true });
        });
        const c = document.createElement("canvas");
        c.width = 720; c.height = 540;
        const ctx = c.getContext("2d");
        ctx?.drawImage(v, 0, 0, c.width, c.height);
        frameBlob = await new Promise<Blob>((res) =>
          c.toBlob((b) => res(b!), "image/jpeg", 0.85),
        );
        URL.revokeObjectURL(u);
      } else {
        // Si no hay video, usamos la miniatura del registro
        frameBlob = registro.miniatura;
      }
      const blob = await generarCanvas1080(
        frameBlob,
        registro.frase,
        etiqueta.nombre,
        registro.especie as Especie,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mascota-${registro.animo}-${registro.creadoEn}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback("Imagen guardada en tu computador.");
      setTimeout(() => setFeedback(null), 2200);
    } catch {
      setFeedback("No pudimos guardar la imagen.");
      setTimeout(() => setFeedback(null), 2400);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Detalle de la traducción">
      <div className="modal-card detalle" id="modal-detalle">
        <div className="cluster justify-between">
          <h2>Tu mascota dice:</h2>
          <span className="badge badge-brand">
            <span aria-hidden="true">{etiqueta.emoji}</span> {etiqueta.nombre}
          </span>
        </div>
        <p className="subtitle">Puedes volver a guardar esta traducción como imagen.</p>

        <p className="subtitle mt-3" style={{ fontSize: "1.05rem", color: "var(--text)" }}>
          “{registro.frase}”
        </p>

        {videoUrl ? (
          <div className="video-frame mt-4">
            <video
              src={videoUrl}
              controls
              playsInline
              aria-label="Video guardado de la mascota"
            />
          </div>
        ) : (
          <div className="alert alert-warn mt-4" role="status">
            El video ya no está guardado — pero la traducción sigue aquí.
          </div>
        )}

        <div className="modal-acciones mt-4">
          <button type="button" className="btn btn-ghost" onClick={guardarImagen}>
            🖼️ Guardar imagen
          </button>
          <button
            ref={cerrarRef}
            type="button"
            className="btn btn-primary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>

        {feedback && (
          <p className="text-sm mt-3" style={{ color: "var(--ok)" }} role="status" aria-live="polite">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
