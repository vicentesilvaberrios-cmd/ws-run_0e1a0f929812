"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Encabezado() {
  const pathname = usePathname();
  const enHistorial = pathname === "/historial";

  return (
    <div className="navbar">
      <Link href="/" className="brand" aria-label="Ir al inicio">
        <span className="brand-mark" aria-hidden="true">🐾</span>
        <span>¿Qué Dice Mi Mascota?</span>
      </Link>
      <nav aria-label="Principal">
        <Link
          href="/"
          className={"nav-link" + (pathname === "/" ? " is-active" : "")}
        >
          Traducir
        </Link>
        <Link
          href="/historial"
          className={"nav-link" + (enHistorial ? " is-active" : "")}
          aria-label="Ver mis traducciones guardadas"
        >
          Mis traducciones
        </Link>
      </nav>
    </div>
  );
}
