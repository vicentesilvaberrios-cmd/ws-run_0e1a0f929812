// Preferencias del usuario persistidas en localStorage.
// Claves permitidas y valores por defecto deny-by-default.
// Aquí solo guardamos especie y tono, ambos con default válido (tono =
// "tierno"; especie requiere elección explícita del usuario la primera
// vez).

import type { Especie, Tono } from "./types";

const STORAGE_KEY = "qdm.preferencias.v1";

interface Preferencias {
  especie: Especie | undefined;
  tono: Tono;
}

function loadAll(): Preferencias {
  if (typeof localStorage === "undefined") {
    return { especie: undefined, tono: "tierno" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { especie: undefined, tono: "tierno" };
    const parsed = JSON.parse(raw) as Partial<Preferencias>;
    return sanitize(parsed);
  } catch {
    return { especie: undefined, tono: "tierno" };
  }
}

function saveAll(p: Preferencias): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // sin cuota / sin permisos: ignoramos (la app sigue funcionando en memoria)
  }
}

function sanitize(p: Partial<Preferencias>): Preferencias {
  const especie = p.especie === "perro" || p.especie === "gato" ? p.especie : undefined;
  const tono = p.tono === "tierno" || p.tono === "sarcastico" ? p.tono : "tierno";
  return { especie, tono };
}

// Sobrecargas tipadas: cada clave devuelve exactamente su tipo.
export function getPreferencia(clave: "especie"): Especie | undefined;
export function getPreferencia(clave: "tono"): Tono;
export function getPreferencia(clave: "especie" | "tono"): Especie | undefined | Tono;
export function getPreferencia(clave: string): unknown {
  const all = loadAll();
  if (clave === "especie") return all.especie;
  if (clave === "tono") return all.tono;
  throw new Error(`Preferencia inválida: ${clave}`);
}

export function setPreferencia(clave: "especie", valor: Especie | null | undefined): void;
export function setPreferencia(clave: "tono", valor: Tono | null | undefined): void;
export function setPreferencia(clave: string, valor: unknown): void {
  const all = loadAll();
  if (clave === "especie") {
    if (valor === undefined || valor === null) {
      all.especie = undefined;
    } else if (valor === "perro" || valor === "gato") {
      all.especie = valor;
    } else {
      throw new Error("Valor inválido para especie");
    }
  } else if (clave === "tono") {
    if (valor === undefined || valor === null) {
      all.tono = "tierno";
    } else if (valor === "tierno" || valor === "sarcastico") {
      all.tono = valor;
    } else {
      throw new Error("Valor inválido para tono");
    }
  } else {
    throw new Error(`Preferencia inválida: ${clave}`);
  }
  saveAll(all);
}