import type { ReactNode } from "react";
import "./globals.css";
import Encabezado from "./components/Encabezado";
import LineaHonestidad from "./components/LineaHonestidad";

export const metadata = {
  title: "¿Qué Dice Mi Mascota? — Traductor de mascotas",
  description:
    "Sube o graba un video de tu perro o gato y descubre, con humor, qué dice, su ánimo y por qué lo creemos. Todo se calcula en tu computador, sin enviar nada a la nube.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <div className="app-shell">
          <header role="banner">
            <Encabezado />
          </header>
          <main id="contenido" className="app-main container" tabIndex={-1}>
            {children}
          </main>
          <footer role="contentinfo">
            <LineaHonestidad />
          </footer>
        </div>
      </body>
    </html>
  );
}
