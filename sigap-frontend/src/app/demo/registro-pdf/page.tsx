"use client";

import { useEffect, useState } from "react";

type Informe = { folio: string; pdf: string };

export default function RegistroPdfDemo() {
  const [informe, setInforme] = useState<Informe | null>(null);
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    const leer = () => {
      try {
        const raw = localStorage.getItem("sigap-registro-pdf");
        setInforme(raw ? JSON.parse(raw) : null);
      } catch { setInforme(null); }
      setCargado(true);
    };
    leer();
    window.addEventListener("storage", leer);
    return () => window.removeEventListener("storage", leer);
  }, []);
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">PDF del registro - revisión de demo</h1>
      <p className="mt-2 text-sm text-gray-600">Último registro enviado desde este navegador. Esta pantalla aún no tiene control de acceso; la entrega a profesores se integrará después.</p>
      {informe ? <>
        <div className="my-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-primary">{informe.folio}</p>
          <a href={informe.pdf} download={`Registro-${informe.folio}.pdf`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Descargar PDF</a>
        </div>
        <iframe title={`Registro completo ${informe.folio}`} src={informe.pdf} className="h-[75vh] w-full rounded-xl border border-gray-200 bg-white" />
      </> : <p className="mt-6 rounded-lg bg-white p-5 text-gray-600">{cargado ? "Todavía no hay un PDF. Completa el formulario y pulsa Enviar registro." : "Cargando PDF…"}</p>}
    </main>
  );
}
