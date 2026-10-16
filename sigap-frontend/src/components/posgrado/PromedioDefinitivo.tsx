"use client";
import { useState } from "react";
import { usePosgrado } from "./PosgradoProvider";
import type { AspiranteP } from "@/lib/posgrado/datos";

export function PromedioDefinitivo({ a }: { a: AspiranteP }) {
  const { actualizar } = usePosgrado();
  const [valor, setValor] = useState(a.promedio);
  const aprobado = a.documentos.some((d) => d.id === "certificado" && d.estado === "aprobado");
  const numero = Number(valor);
  const valido = valor.trim() !== "" && Number.isFinite(numero) && numero >= 6 && numero <= 10;
  return <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
    <h2 className="font-semibold text-gray-900">Promedio definitivo del certificado de estudios</h2>
    {!aprobado ? <p className="mt-2 text-sm text-gray-500">Aprueba el certificado de estudios para capturar el promedio definitivo.</p> : <>
      <p className="mt-1 text-sm text-gray-500">Captura el promedio que aparece en el certificado aprobado. Se reflejará en el expediente y los reportes.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">Promedio (6 a 10)
          <input aria-label="Promedio definitivo del certificado" type="number" min="6" max="10" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <button type="button" disabled={!valido} onClick={() => actualizar(a.id, { promedio: numero.toFixed(2), promedioValidadoEl: new Date().toISOString() }, `Registró promedio definitivo ${numero.toFixed(2)} del certificado aprobado`)} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-40">Guardar promedio definitivo</button>
        {a.promedioValidadoEl && <p role="status" className="text-sm text-emerald-700">Promedio validado: {a.promedio}</p>}
      </div>
    </>}
  </section>;
}
