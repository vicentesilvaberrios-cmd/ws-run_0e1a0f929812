"use client";

import { useEffect, useState } from "react";
import type { DatosHistorial } from "../../lib/types";
import { ETIQUETAS } from "../../lib/frases";

interface Props {
  registro: DatosHistorial;
  onAbrir: () => void;
  onBorrar: () => void;
}

export default function TarjetaHistorial({ registro, onAbrir, onBorrar }: Props) {
  const [miniaturaUrl, setMiniaturaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!registro.miniatura) return;
    const url = URL.createObjectURL(registro.miniatura);
    setMiniaturaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [registro.miniatura]);

  const etiqueta = ETIQUETAS[registro.animo];
  const fechaRelativa = tiempoRelativo(registro.creadoEn);

  return (
    <article
      className="tarjeta-historial fade-up"
      role="button"
      tabIndex={0}
      aria-label={`Ver traducción: ${registro.frase}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
    >
      <div className="miniatura">
        {miniaturaUrl ? (
          <img src={miniaturaUrl} alt="" />
        ) : (
          <span className="emoji-fallback" aria-hidden="true">🎬</span>
        )}
        <span className="badge-animo" aria-hidden="true">{etiqueta.emoji}</span>
        {!registro.video && (
          <span className="badge-sin-video" aria-label="Sin video guardado">
            sin video
          </span>
        )}
      </div>
      <div className="contenido">
        <div className="frase">{registro.frase}</div>
        <div className="meta">
          <span>
            <span className="muted">{fechaRelativa}</span>
          </span>
          <div className="acciones" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); onBorrar(); }}
              aria-label={`Borrar esta traducción (abre confirmación)`}
              aria-haspopup="dialog"
              title="Saca esta traducción de tu historial (pide confirmación)."
            >
              🗑 Borrar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function tiempoRelativo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "recién";
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `hace ${d} ${d === 1 ? "día" : "días"}`;
  const mo = Math.floor(d / 30);
  if (mo < 12)  return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
  const y = Math.floor(mo / 12);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}
