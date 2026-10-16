"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, EtiquetaBandeja, Progreso, Regresar, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { bandejaDe, fechaCorta, progresoDe } from "@/lib/posgrado/datos";
import { TONO_DICTAMEN, descargarReporteAspirantes, dictamenFinal, procedenciaSeparada } from "@/lib/reporte-aspirantes";
import { FASES_SUBDIRECCION, cumpleFiltro } from "@/lib/subdireccion";
import { SoloConsulta } from "./SoloConsulta";

const FILTROS = [
  { id: "", t: "Todos" },
  { id: "proceso", t: "En proceso" },
  { id: "admitido", t: "Admitidos por el Colegio" },
  ...FASES_SUBDIRECCION.map((f) => ({ id: f.id, t: f.t })),
];

/** Lista de aspirantes con sus datos principales (Subdirección Académica, solo consulta). */
export function ListaAspirantes({ faseInicial }: { faseInicial: string }) {
  const { aspirantes, cargado } = usePosgrado();
  const [fase, setFase] = useState(faseInicial);
  const [q, setQ] = useState("");
  if (!cargado) return null;

  const texto = q.trim().toLowerCase();
  const lista = aspirantes
    .filter((a) => cumpleFiltro(a, fase))
    .filter((a) => !texto || [a.id, a.nombre, a.curp, a.correo, a.procedencia].some((x) => x.toLowerCase().includes(texto)))
    .sort((a, b) => a.registradoEl.localeCompare(b.registradoEl));

  return (
    <>
      <Regresar href="/subdireccion" t="Inicio" />
      <PageHeader titulo="Aspirantes" subtitulo="Registro de aspirantes y avance de su proceso de admisión" />
      <SoloConsulta />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm sm:max-w-sm">
          <span className="font-medium text-gray-900">Buscar</span>
          <span className="relative mt-1 block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, ID, CURP, correo o procedencia" className={`${inputBase} pl-9`} />
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Fase</span>
          <select value={fase} onChange={(e) => setFase(e.target.value)} className={`${inputBase} mt-1`}>
            {FILTROS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.t}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => descargarReporteAspirantes(lista)} disabled={!lista.length} className={`${botonSecundario} sm:ml-auto`}>
          <Download size={15} /> Descargar CSV
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Encabezado de columnas (solo en pantallas anchas; en pantallas chicas cada aspirante es una tarjeta) */}
        <div className="hidden gap-4 bg-gray-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_auto]">
          <span>Aspirante</span>
          <span>Contacto y procedencia</span>
          <span>Avance</span>
          <span>Estado y dictamen</span>
          <span className="w-20" />
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {lista.map((a) => {
            const p = progresoDe(a);
            const proc = procedenciaSeparada(a.procedencia);
            const dic = dictamenFinal(a);
            return (
              <li key={a.id} data-aspirante={a.id} className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:items-start lg:gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_auto]">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{a.nombre}</p>
                  <p className="font-mono text-xs text-gray-500">
                    {a.id}
                    {a.uteycv?.sicep && <span className="ml-1 text-emerald-700">· {a.uteycv.sicep}</span>}
                  </p>
                  <p className="break-all font-mono text-xs text-gray-600">{a.curp}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Promedio <span className="font-medium text-gray-900">{a.promedio}</span> · Registro {fechaCorta(a.registradoEl)}
                  </p>
                </div>
                <div className="min-w-0 text-xs text-gray-700">
                  <span className="block break-all">{a.correo}</span>
                  <span className="block text-gray-500">{a.telefono}</span>
                  <span className="mt-1 block text-sm font-medium text-gray-900">{proc.institucion}</span>
                  {proc.unidad && <span className="text-gray-500">{proc.unidad}</span>}
                </div>
                <div className="min-w-0">
                  <Progreso pct={a.concluido ? 100 : p.pct} texto={a.concluido ? "Concluido" : p.texto} />
                </div>
                <div className="flex min-w-0 flex-wrap items-start gap-1.5">
                  <EtiquetaBandeja b={bandejaDe(a)} />
                  {dic ? <Etiqueta tono={TONO_DICTAMEN[dic]}>{dic}</Etiqueta> : <span className="text-xs text-gray-400">Sin dictamen</span>}
                </div>
                <div className="lg:w-20 lg:text-right">
                  <Link href={`/subdireccion/aspirantes/${a.id}`} className="font-medium text-primary hover:underline">
                    Ver proceso
                  </Link>
                </div>
              </li>
            );
          })}
          {!lista.length && <li className="px-5 py-8 text-center text-gray-500">No hay aspirantes con ese filtro.</li>}
        </ul>
        <p className="border-t border-gray-100 px-5 py-2.5 text-xs text-gray-500">
          {lista.length} de {aspirantes.length} aspirante(s)
        </p>
      </section>
    </>
  );
}
