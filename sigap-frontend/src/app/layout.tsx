import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIGAP · CIDETEC IPN",
  description: "Sistema Integral de Gestión Académica de Posgrado — CIDETEC, Instituto Politécnico Nacional",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
