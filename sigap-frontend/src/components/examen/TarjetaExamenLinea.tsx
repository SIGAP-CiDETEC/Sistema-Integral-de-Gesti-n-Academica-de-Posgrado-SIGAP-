"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileQuestion, PlayCircle } from "lucide-react";
import { useAspiranteActivo } from "@/lib/aspirante-activo";
import { areasHabilitadas, claveIntento, estadoVentana, useExamen } from "@/lib/examen";
import { nombreArea } from "@/lib/posgrado/datos";

const fecha = (s: string) => new Date(s).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Aviso en la fase de Evaluación del aspirante cuando Posgrado le habilitó el examen en línea (uno por área). */
export function TarjetaExamenLinea() {
  const idLocal = useAspiranteActivo();
  const estado = useExamen();
  const id = estado.yo ?? idLocal;
  const { intentos, config, cargado } = estado;
  const areas = areasHabilitadas(estado, id);
  if (!cargado || !areas.length) return null;
  const hayQuePresentar = areas.some((a) => !intentos[claveIntento(id, a)]?.terminadoEl && estadoVentana(config.areas[a]) === "abierta");
  return (
    <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
        <FileQuestion size={17} /> {config.titulo} · en línea
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {areas.map((a) => {
          const ca = config.areas[a];
          const i = intentos[claveIntento(id, a)];
          const v = estadoVentana(ca);
          return (
            <li key={a} className="flex flex-wrap items-center gap-x-2 text-gray-700">
              <span className="font-medium text-gray-900">{nombreArea(a)}:</span>
              {i?.terminadoEl ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 size={14} /> entregado
                </span>
              ) : i ? (
                <span className="text-sky-800">en curso</span>
              ) : v === "cerrada" ? (
                <span className="text-red-700">el periodo terminó</span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} /> {fecha(ca.inicio)} · {ca.duracionMin} min
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/aspirante/examen" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
        <PlayCircle size={16} /> {hayQuePresentar ? "Ir a mis exámenes" : "Ver mis exámenes"}
      </Link>
    </section>
  );
}
