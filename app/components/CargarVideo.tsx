"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Especie, Tono } from "../../lib/types";
import { getPreferencia, setPreferencia } from "../../lib/preferencias";
import { verificarDuracion } from "../../lib/video";

export interface VideoCargado {
  /** Blob del video seleccionado o grabado. */
  blob: Blob;
  /** URL local del blob para usar en <video>. */
  url: string;
  /** Nombre del archivo (cuando viene del disco). */
  nombre: string;
  /** Duración en segundos. */
  duracion: number;
}

type EstadoWebcam =
  | { tipo: "apagado" }
  | { tipo: "pidiendo" }
  | { tipo: "grabando"; tiempoRestante: number; tiempoGrabado: number; mediaRecorder: MediaRecorder; chunks: Blob[]; stream: MediaStream };

interface Props {
  /** Video cargado (si lo hay). El padre lo gestiona. */
  video: VideoCargado | null;
  /** Cambia el video cargado. */
  onVideoChange: (v: VideoCargado | null) => void;
  /** Especie seleccionada (controlada por el padre para que Analizar la vea). */
  especie: Especie | null;
  onEspecieChange: (e: Especie) => void;
  /** Tono seleccionado. */
  tono: Tono;
  onTonoChange: (t: Tono) => void;
  /** Callback al pulsar Analizar. */
  onAnalizar: () => void;
  /** Si el botón Analizar debe estar activo. */
  puedeAnalizar: boolean;
  /** Errores externos a mostrar. */
  error?: string | null;
  /** Limpia el error externo cuando el usuario cambia algo. */
  onConsumirError?: () => void;
}

const MAX_GRAB_SEG = 10;
const MIN_GRAB_SEG = 2;

export default function CargarVideo({
  video,
  onVideoChange,
  especie,
  onEspecieChange,
  tono,
  onTonoChange,
  onAnalizar,
  puedeAnalizar,
  error,
  onConsumirError,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [errores, setErrores] = useState<{ especie?: string }>({});
  const [estadoWeb, setEstadoWeb] = useState<EstadoWebcam>({ tipo: "apagado" });
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  // Soporte de webcam: detectado una sola vez al montar (true por defecto en SSR).
  const [webcamSoportada, setWebcamSoportada] = useState(true);

  // Detectar si el navegador expone getUserMedia (algunos contextos no lo hacen).
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const soportado =
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    setWebcamSoportada(soportado);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Cargar preferencia inicial de especie
  useEffect(() => {
    if (especie) return;
    const guardada = getPreferencia("especie");
    if (guardada) onEspecieChange(guardada);
  }, [especie, onEspecieChange]);

  // Persistir especie cuando cambia
  useEffect(() => {
    if (especie) setPreferencia("especie", especie);
  }, [especie]);

  // Drag & drop a nivel ventana
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        setDragOver(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      // Solo dejar de marcar cuando realmente salimos de la ventana
      if (e.relatedTarget === null) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void manejarArchivo(f);
      }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atajos de teclado: Espacio graba/para; Enter analiza
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
      if (e.key === " " || e.code === "Space") {
        // grabar/parar (solo si la webcam es compatible con el navegador)
        if (estadoWeb.tipo === "grabando") {
          e.preventDefault();
          detenerGrabacion();
        } else if (estadoWeb.tipo === "apagado" && !video && webcamSoportada) {
          e.preventDefault();
          void iniciarGrabacion();
        }
      } else if (e.key === "Enter") {
        if (puedeAnalizar) {
          e.preventDefault();
          onAnalizar();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeAnalizar, estadoWeb.tipo, video, webcamSoportada]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (estadoWeb.tipo === "grabando") {
        try { estadoWeb.mediaRecorder.stop(); } catch { /* noop */ }
        estadoWeb.stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarArchivo = useCallback(
    async (file: File) => {
      setErrorLocal(null);
      onConsumirError?.();
      try {
        const duracion = await verificarDuracion(file);
        const blob = file.slice(0, file.size, file.type || "video/webm");
        const url = URL.createObjectURL(blob);
        onVideoChange({
          blob,
          url,
          nombre: file.name,
          duracion,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No pudimos leer el video";
        setErrorLocal(msg);
      }
    },
    [onVideoChange, onConsumirError],
  );

  const quitarVideo = () => {
    if (video?.url) URL.revokeObjectURL(video.url);
    onVideoChange(null);
    setErrorLocal(null);
    onConsumirError?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const iniciarGrabacion = useCallback(async () => {
    setErrorLocal(null);
    onConsumirError?.();
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorLocal(
        "Tu navegador no permite grabar. Puedes arrastrar un video en su lugar.",
      );
      return;
    }
    setEstadoWeb({ tipo: "pidiendo" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType =
        mimeCandidates.find((m) =>
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
        ) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const inicioMs = Date.now();
      let timer: ReturnType<typeof setInterval> | undefined;
      let stopper: ReturnType<typeof setTimeout> | undefined;

      const finalizar = (autopara: boolean) => {
        if (timer) clearInterval(timer);
        if (stopper) clearTimeout(stopper);
        if (recorder.state !== "inactive") {
          try { recorder.stop(); } catch { /* noop */ }
        }
        stream.getTracks().forEach((t) => t.stop());
        recorder.onstop = () => {
          const duracion = (Date.now() - inicioMs) / 1000;
          const tipoFinal = recorder.mimeType || mimeType || "video/webm";
          const blob = new Blob(chunks, { type: tipoFinal });
          if (duracion < MIN_GRAB_SEG) {
            setErrorLocal("Grabación muy corta, graba al menos 2 segundos");
            return;
          }
          if (autopara) {
            // Corte automático por max
          }
          const url = URL.createObjectURL(blob);
          onVideoChange({
            blob,
            url,
            nombre: `grabacion-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`,
            duracion: Math.min(duracion, MAX_GRAB_SEG),
          });
        };
        setEstadoWeb({ tipo: "apagado" });
      };

      recorder.onstart = () => {
        let restante = MAX_GRAB_SEG;
        let grabado = 0;
        timer = setInterval(() => {
          restante = Math.max(0, MAX_GRAB_SEG - (Date.now() - inicioMs) / 1000);
          grabado = (Date.now() - inicioMs) / 1000;
          setEstadoWeb((s) =>
            s.tipo === "grabando"
              ? { ...s, tiempoRestante: restante, tiempoGrabado: grabado }
              : s,
          );
          if (restante <= 0) finalizar(true);
        }, 100);
      };
      recorder.onerror = () => {
        finalizar(false);
        setErrorLocal("No pudimos terminar la grabación");
      };

      // Hacemos stop público a través del ref del estado
      recorder.start();
      stopper = setTimeout(() => finalizar(true), MAX_GRAB_SEG * 1000);
      setEstadoWeb({
        tipo: "grabando",
        tiempoRestante: MAX_GRAB_SEG,
        tiempoGrabado: 0,
        mediaRecorder: recorder,
        chunks,
        stream,
      });

      // Exponer función de parada para los atajos
      (window as unknown as { __pararGrabacion?: () => void }).__pararGrabacion = () => {
        if (recorder.state !== "inactive") finalizar(false);
      };
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "NotAllowedError"
          ? "No pudimos acceder a la cámara. Puedes arrastrar un video en su lugar."
          : "No pudimos acceder a la cámara. Puedes arrastrar un video en su lugar.";
      setErrorLocal(msg);
      setEstadoWeb({ tipo: "apagado" });
    }
  }, [onVideoChange, onConsumirError]);

  const detenerGrabacion = () => {
    (window as unknown as { __pararGrabacion?: () => void }).__pararGrabacion?.();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validación final
    if (!especie) {
      setErrores({ especie: "Elige si es perro o gato" });
      return;
    }
    if (!video || !puedeAnalizar) return;
    onAnalizar();
  };

  const elegirEspecie = (nueva: Especie) => {
    onEspecieChange(nueva);
    setErrores((e) => ({ ...e, especie: undefined }));
    onConsumirError?.();
  };

  const errorAMostrar = errorLocal || error;

  return (
    <form className="stack fade-up" onSubmit={onSubmit}>
      {/* Subtítulo de propósito */}
      <p className="subtitle">
        Arrastra un video de tu perro o gato (máximo 1 minuto) y te diremos qué
        dice, su ánimo y por qué lo creemos.
      </p>

      {/* Zona de carga o video ya listo */}
      {!video ? (
        <>
          <button
            ref={dropzoneRef}
            type="button"
            className={"dropzone" + (dragOver ? " is-dragover" : "")}
            role="button"
            tabIndex={0}
            aria-label="Zona para arrastrar tu video. También puedes usar el botón Elegir un video."
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <span className="drop-icon" aria-hidden="true">🎬</span>
            <span className="drop-titulo">Arrastra aquí tu video</span>
            <span className="drop-sub">o usa los botones de abajo.</span>
          </button>

          {/* Pasos cuando aún no hay video */}
          <ol className="steps" aria-label="Pasos para traducir a tu mascota">
            <li>Sube o graba un video de tu mascota.</li>
            <li>Elige si es perro o gato y el tono que prefieras.</li>
            <li>Pulsa <kbd>Analizar</kbd> (o la tecla <kbd>Enter</kbd>).</li>
          </ol>

          {/* Webcam en vivo */}
          {(estadoWeb.tipo === "pidiendo" || estadoWeb.tipo === "grabando") && (
            <div className="webcam-wrap pop-in" aria-live="polite">
              <video ref={previewRef} autoPlay playsInline muted aria-label="Vista previa de tu cámara" />
              {estadoWeb.tipo === "grabando" && (
                <span className="grabando-chip" aria-live="polite">
                  <span className="dot" aria-hidden="true" />
                  Grabando · {formatoSeg(estadoWeb.tiempoGrabado)}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="video-cargado fade-in" role="status">
          <video src={video.url} muted playsInline />
          <div className="info">
            <strong>Listo, video cargado</strong>
            <span className="meta">
              {video.nombre} · {formatoSeg(video.duracion)}
            </span>
            <div className="cluster mt-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={quitarVideo}
              >
                Quitar
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Cambiar video
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void manejarArchivo(f);
        }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Botones de carga */}
      <div className="cluster">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          🎞️ Elegir un video
        </button>
        {estadoWeb.tipo === "apagado" ? (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void iniciarGrabacion()}
              disabled={!webcamSoportada}
              aria-disabled={!webcamSoportada}
              title={
                webcamSoportada
                  ? undefined
                  : "Tu navegador no expone webcam; arrastra un video en su lugar."
              }
            >
              🎥 Grabar con la webcam
            </button>
            {!webcamSoportada && (
              <span className="text-sm muted" role="note">
                Tu navegador no expone webcam. Arrastra un video en su lugar.
              </span>
            )}
          </>
        ) : estadoWeb.tipo === "pidiendo" ? (
          <button type="button" className="btn btn-ghost" disabled>
            Pidiendo permiso…
          </button>
        ) : (
          <button type="button" className="btn btn-danger" onClick={detenerGrabacion}>
            ⏹ Detener grabación
          </button>
        )}
      </div>

      {/* Opciones avanzadas (ocultas por defecto) */}
      <div>
        <button
          type="button"
          className="adv-toggle"
          aria-expanded={mostrarAvanzado}
          onClick={() => setMostrarAvanzado((v) => !v)}
        >
          {mostrarAvanzado ? "Ocultar opciones de cámara" : "Mostrar opciones de cámara"}
        </button>
        {mostrarAvanzado && (
          <p className="text-sm muted mt-2">
            Cuando termines de grabar, el video se revisa en tu computador y
            nunca se envía a ningún servidor.
          </p>
        )}
      </div>

      {/* Errores */}
      {errorAMostrar && (
        <div className="alert alert-error" role="alert">
          {errorAMostrar}
        </div>
      )}

      {/* Selector de especie */}
      <div className="field">
        <label>
          ¿Quién es?
          <span
            className="help-tip"
            tabIndex={0}
            role="note"
            aria-label="¿Tu mascota es un perro o un gato? Esto cambia cómo interpretamos sus señales."
            data-tip="¿Tu mascota es un perro o un gato? Esto cambia cómo interpretamos sus señales."
          >?</span>
        </label>
        <div className="especie-grid" role="radiogroup" aria-label="Especie de la mascota">
          <button
            type="button"
            className="especie-card"
            role="radio"
            aria-checked={especie === "perro"}
            aria-pressed={especie === "perro"}
            onClick={() => elegirEspecie("perro")}
          >
            <span className="icon" aria-hidden="true">🐶</span>
            <span className="texto">
              <strong>Perro</strong>
              <span>Ladridos, colitas, paseos</span>
            </span>
          </button>
          <button
            type="button"
            className="especie-card"
            role="radio"
            aria-checked={especie === "gato"}
            aria-pressed={especie === "gato"}
            onClick={() => elegirEspecie("gato")}
          >
            <span className="icon" aria-hidden="true">🐱</span>
            <span className="texto">
              <strong>Gato</strong>
              <span>Maullidos, ronroneos, siestas</span>
            </span>
          </button>
        </div>
        {errores.especie && (
          <span className="error-text" role="alert">{errores.especie}</span>
        )}
      </div>

      {/* Tono */}
      <div className="field">
        <label>
          Tono de la traducción
          <span
            className="help-tip"
            tabIndex={0}
            role="note"
            aria-label="Tierno: frases cariñosas. Sarcástico: frases con humor negro."
            data-tip="Tierno: frases cariñosas. Sarcástico: frases con humor negro."
          >?</span>
        </label>
        <div className="chips" role="radiogroup" aria-label="Tono">
          <button
            type="button"
            className="chip"
            role="radio"
            aria-checked={tono === "tierno"}
            aria-pressed={tono === "tierno"}
            onClick={() => { onTonoChange("tierno"); onConsumirError?.(); }}
          >
            💗 Tierno
          </button>
          <button
            type="button"
            className="chip"
            role="radio"
            aria-checked={tono === "sarcastico"}
            aria-pressed={tono === "sarcastico"}
            onClick={() => { onTonoChange("sarcastico"); onConsumirError?.(); }}
          >
            😏 Sarcástico
          </button>
        </div>
      </div>

      {/* Botón analizar */}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={!puedeAnalizar}
      >
        Analizar
      </button>
    </form>
  );
}

function formatoSeg(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
