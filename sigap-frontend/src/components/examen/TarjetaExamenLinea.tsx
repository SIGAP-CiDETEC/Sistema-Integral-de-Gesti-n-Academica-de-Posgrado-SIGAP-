"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileQuestion, PlayCircle } from "lucide-react";
import { useAspiranteActivo } from "@/lib/aspirante-activo";
import { estadoVentana, useExamen } from "@/lib/examen";
import { nombreArea } from "@/lib/posgrado/datos";

const fecha = (s: string) => new Date(s).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Aviso en la fase de Evaluación del aspirante cuando Posgrado le habilitó el examen en línea. */
export function TarjetaExamenLinea() {
  const id = useAspiranteActivo();
  const { habilitados, intentos, config, cargado } = useExamen();
  const h = habilitados[id];
  if (!cargado || !h) return null;
  const i = intentos[id];
  const ventana = estadoVentana(config);
  return (
    <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
        <FileQuestion size={17} /> {config.titulo} · en línea
      </p>
      <p className="mt-1 text-sm text-gray-700">
        Áreas: {(i?.areas ?? h.areas.filter((a) => config.areasEnLinea.includes(a))).map(nombreArea).join(" y ")} · {config.duracionMin} minutos · un solo intento.
      </p>
      {i?.terminadoEl ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} /> Entregaste tu examen el {fecha(i.terminadoEl)}. El Departamento de Posgrado publicará tu resultado.
        </p>
      ) : ventana === "antes" ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <Clock size={15} /> Podrás iniciarlo a partir del {fecha(config.inicio)} y hasta el {fecha(config.fin)}.
        </p>
      ) : ventana === "cerrada" && !i ? (
        <p className="mt-3 text-sm text-red-700">El periodo para presentar el examen terminó.</p>
      ) : (
        <Link href="/aspirante/examen" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
          <PlayCircle size={16} /> {i ? "Continuar mi examen" : "Ir al examen"}
        </Link>
      )}
    </section>
  );
}
