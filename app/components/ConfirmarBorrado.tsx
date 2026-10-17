"use client";

import { useEffect, useRef } from "react";

interface Props {
  abierto: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Texto del botón destructivo (por defecto "Sí, borrar todo"). */
  textoConfirmar?: string;
  /** Título del modal (opcional). */
  titulo?: string;
  /** Mensaje descriptivo bajo el título (opcional). */
  mensaje?: string;
  /** Nota aclaratoria al pie del modal (opcional). */
  nota?: string;
}

export default function ConfirmarBorrado({
  abierto,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Sí, borrar todo",
  titulo = "¿Borrar todas tus traducciones?",
  mensaje = "Esta acción no se puede deshacer.",
  nota = "Se eliminarán todos los registros guardados en este navegador, incluidas las miniaturas y los videos.",
}: Props) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cancelarRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelar();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, onCancelar]);

  // Atrapa foco básico
  useEffect(() => {
    if (!abierto) return;
    const modal = document.getElementById("modal-confirmar");
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
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar borrado"
    >
      <div className="modal-card" id="modal-confirmar">
        <h2>{titulo}</h2>
        <p className="subtitle mt-2">{mensaje}</p>
        {nota && (
          <p className="text-sm muted mt-3">{nota}</p>
        )}
        <div className="modal-acciones mt-4">
          <button
            ref={cancelarRef}
            type="button"
            className="btn btn-ghost"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
