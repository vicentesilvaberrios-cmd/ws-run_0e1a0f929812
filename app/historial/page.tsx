"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import TarjetaHistorial from "../components/TarjetaHistorial";
import DetalleTraduccion from "../components/DetalleTraduccion";
import ConfirmarBorrado from "../components/ConfirmarBorrado";
import { HistorialDB } from "../../lib/historial";
import type { DatosHistorial } from "../../lib/types";

export default function HistorialPage() {
  const [registros, setRegistros] = useState<DatosHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abrirId, setAbrirId] = useState<number | null>(null);
  const [confirmarTodo, setConfirmarTodo] = useState(false);
  // Borrado individual con confirmación modal (AC4.3).
  const [pendienteBorrar, setPendienteBorrar] = useState<DatosHistorial | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await HistorialDB.listar();
      setRegistros(lista);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = useCallback((r: DatosHistorial) => {
    if (r.id != null) setAbrirId(r.id);
  }, []);

  const pedirBorrarUno = useCallback((r: DatosHistorial) => {
    setPendienteBorrar(r);
  }, []);

  const confirmarBorrarUno = useCallback(async () => {
    const r = pendienteBorrar;
    if (!r || r.id == null) {
      setPendienteBorrar(null);
      return;
    }
    await HistorialDB.borrar(r.id);
    setRegistros((prev) => prev.filter((x) => x.id !== r.id));
    setPendienteBorrar(null);
  }, [pendienteBorrar]);

  const borrarTodo = useCallback(async () => {
    await HistorialDB.borrarTodo();
    setRegistros([]);
    setConfirmarTodo(false);
  }, []);

  const registroAbierto = registros.find((r) => r.id === abrirId) ?? null;

  return (
    <div className="stack" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="toolbar justify-between">
        <div>
          <h1 style={{ marginBottom: 4 }}>Mis traducciones</h1>
          <p className="subtitle">
            Aquí quedan todas las traducciones que hiciste. Puedes volver a
            verlas o guardarlas como imagen.
          </p>
        </div>
        {registros.length > 0 && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmarTodo(true)}
            aria-label="Borrar todas las traducciones"
          >
            🗑 Borrar todo
            <span
              className="help-tip"
              tabIndex={0}
              role="note"
              aria-label="Elimina todas las traducciones de tu historial. No se puede deshacer."
              data-tip="Elimina todas las traducciones de tu historial. No se puede deshacer."
            >?</span>
          </button>
        )}
      </div>

      {cargando ? (
        <div className="empty-state">
          <p>Cargando tus traducciones…</p>
        </div>
      ) : registros.length === 0 ? (
        <div className="empty-state historial-empty fade-in">
          <div className="emoji" aria-hidden="true">🐾</div>
          <h2>Todavía no traduces nada</h2>
          <p>
            Arrastra un video de tu mascota en la página principal y vuelve
            aquí para ver tus traducciones.
          </p>
          <Link href="/" className="btn btn-primary mt-3">
            Ir a traducir
          </Link>
        </div>
      ) : (
        <div className="grid grid-md-3" role="list" aria-label="Listado de traducciones">
          {registros.map((r) => (
            <div role="listitem" key={r.id ?? `${r.creadoEn}-${r.frase}`}>
              <TarjetaHistorial
                registro={r}
                onAbrir={() => abrir(r)}
                onBorrar={() => pedirBorrarUno(r)}
              />
            </div>
          ))}
        </div>
      )}

      {registroAbierto && (
        <DetalleTraduccion
          registro={registroAbierto}
          onCerrar={() => setAbrirId(null)}
        />
      )}

      <ConfirmarBorrado
        abierto={confirmarTodo}
        onCancelar={() => setConfirmarTodo(false)}
        onConfirmar={() => void borrarTodo()}
      />

      <ConfirmarBorrado
        abierto={!!pendienteBorrar}
        onCancelar={() => setPendienteBorrar(null)}
        onConfirmar={() => void confirmarBorrarUno()}
        titulo="¿Borrar esta traducción?"
        mensaje="Esta acción no se puede deshacer."
        nota="Se eliminará solo este registro del historial en este navegador (miniatura y video si los tenías guardados)."
        textoConfirmar="Sí, borrar"
      />
    </div>
  );
}
