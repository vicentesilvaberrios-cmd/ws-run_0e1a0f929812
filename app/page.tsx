"use client";

import { useCallback, useEffect, useState } from "react";
import CargarVideo, { VideoCargado } from "./components/CargarVideo";
import Analizando from "./components/Analizando";
import Resultado from "./components/Resultado";
import { analizarVideo, clasificar, semillaDe } from "../lib/analisis";
import { getPreferencia } from "../lib/preferencias";
import type { AnalisisCompleto, Especie, Tono } from "../lib/types";

type Fase = "inicio" | "analizando" | "resultado";

export default function HomePage() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [video, setVideo] = useState<VideoCargado | null>(null);
  const [especie, setEspecie] = useState<Especie | null>(() => {
    if (typeof window === "undefined") return null;
    return getPreferencia("especie") ?? null;
  });
  const [tono, setTono] = useState<Tono>("tierno");
  const [error, setError] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisCompleto | null>(null);

  const puedeAnalizar = !!video && !!especie && !error;

  const analizar = useCallback(async () => {
    if (!video || !especie) return;
    setError(null);
    setFase("analizando");
    try {
      // analisis.ts se encarga de consumir el src y liberarlo si es blob.
      const señales = await analizarVideo({ src: video.url });
      const { animo, certeza } = clasificar(señales, especie);
      setAnalisis({
        animo,
        certeza,
        señales,
        especie,
      });
      setFase("resultado");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos analizar el video. Intenta con otro.",
      );
      setFase("inicio");
    }
  }, [video, especie]);

  const analizarOtro = useCallback(() => {
    setAnalisis(null);
    setFase("inicio");
    // mantenemos especie/tono, pero limpiamos el video
    setVideo((v) => {
      if (v?.url) URL.revokeObjectURL(v.url);
      return null;
    });
  }, []);

  // Atajo N en la pantalla de inicio: si hay video, hace de "Analizar"
  useEffect(() => {
    if (fase !== "inicio") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const enEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (enEditable) return;
      if (e.key.toLowerCase() === "n" && puedeAnalizar) {
        e.preventDefault();
        void analizar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fase, puedeAnalizar, analizar]);

  return (
    <div className="stack" style={{ maxWidth: 960, margin: "0 auto" }}>
      {fase === "inicio" && (
        <div className="card">
          <h1>Traduce lo que dice tu mascota</h1>
          <CargarVideo
            video={video}
            onVideoChange={setVideo}
            especie={especie}
            onEspecieChange={setEspecie}
            tono={tono}
            onTonoChange={setTono}
            onAnalizar={() => void analizar()}
            puedeAnalizar={puedeAnalizar}
            error={error}
            onConsumirError={() => setError(null)}
          />
        </div>
      )}

      {fase === "analizando" && video && (
        <Analizando
          videoUrl={video.url}
          onCancelar={() => {
            setFase("inicio");
          }}
        />
      )}

      {fase === "resultado" && analisis && video && (
        <Resultado
          videoUrl={video.url}
          videoBlob={video.blob}
          resultado={analisis}
          tono={tono}
          onTonoChange={setTono}
          onAnalizarOtro={analizarOtro}
        />
      )}
    </div>
  );
}
