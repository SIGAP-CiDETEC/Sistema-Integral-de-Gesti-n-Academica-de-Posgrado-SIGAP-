"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { EtiquetaBandeja, Progreso, Regresar, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { bandejaDe, fechaCorta, progresoDe } from "@/lib/posgrado/datos";
import { FASES_SUBDIRECCION, cumpleFiltro, faseSubdireccion, nombreFase } from "@/lib/subdireccion";
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

  const exportar = () => {
    const filas = [
      ["ID temporal", "Número de registro", "Nombre", "CURP", "Correo", "Teléfono", "Procedencia", "Promedio", "Fecha de registro", "Fase", "Estado"],
      ...lista.map((a) => [a.id, a.uteycv?.sicep ?? "", a.nombre, a.curp, a.correo, a.telefono, a.procedencia, a.promedio, a.registradoEl.slice(0, 10), nombreFase(faseSubdireccion(a)), bandejaDe(a)]),
    ];
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = `Aspirantes_SIGAP_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

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
        <button type="button" onClick={exportar} disabled={!lista.length} className={`${botonSecundario} sm:ml-auto`}>
          <Download size={15} /> Exportar lista (CSV)
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">CURP</th>
                <th className="px-3 py-2.5 font-medium">Contacto</th>
                <th className="px-3 py-2.5 font-medium">Procedencia</th>
                <th className="px-3 py-2.5 text-center font-medium">Promedio</th>
                <th className="px-3 py-2.5 font-medium">Registro</th>
                <th className="px-3 py-2.5 font-medium">Avance</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const p = progresoDe(a);
                return (
                  <tr key={a.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">
                        {a.id}
                        {a.uteycv?.sicep && <span className="ml-1 text-emerald-700">· {a.uteycv.sicep}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{a.curp}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">
                      <span className="block">{a.correo}</span>
                      <span className="text-gray-500">{a.telefono}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{a.procedencia}</td>
                    <td className="px-3 py-3 text-center text-gray-900">{a.promedio}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-600">{fechaCorta(a.registradoEl)}</td>
                    <td className="px-3 py-3">
                      <Progreso pct={a.concluido ? 100 : p.pct} texto={a.concluido ? "Concluido" : p.texto} />
                    </td>
                    <td className="px-3 py-3">
                      <EtiquetaBandeja b={bandejaDe(a)} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/subdireccion/aspirantes/${a.id}`} className="font-medium text-primary hover:underline">
                        Ver proceso
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-500">
                    No hay aspirantes con ese filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-100 px-5 py-2.5 text-xs text-gray-500">
          {lista.length} de {aspirantes.length} aspirante(s)
        </p>
      </section>
    </>
  );
}
