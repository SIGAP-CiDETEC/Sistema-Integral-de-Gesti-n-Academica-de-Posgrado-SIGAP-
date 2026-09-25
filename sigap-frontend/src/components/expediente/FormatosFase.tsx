"use client";

import Link from "next/link";
import { ArrowRight, FileSignature, Send, Sparkles } from "lucide-react";
import { formatosDeFase, type Formato } from "@/lib/formatos";
import type { EtapaId } from "@/lib/admision";
import { useExpediente } from "./ExpedienteProvider";
import { TONOS, estadoFormato } from "./estadoFormato";
import { useBloqueoFormato } from "./bloqueos";

/** Formatos oficiales de una fase que el sistema llena con los datos del aspirante. */
export function FormatosFase({ fase }: { fase: EtapaId }) {
  const lista = formatosDeFase(fase);
  if (!lista.length) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <FileSignature size={17} className="text-primary" /> Formatos que el sistema llena por ti
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Ya vienen llenos con tus datos: completa lo que falte, descarga el PDF, fírmalo a mano y sube el escaneo.
        </p>
      </header>

      <ul className="grid gap-4 p-5 md:grid-cols-2">
        {lista.map((f) => (
          <TarjetaFormato key={f.clave} f={f} />
        ))}
      </ul>
    </section>
  );
}

function TarjetaFormato({ f }: { f: Formato }) {
  const { ctx, firmados, confirmados, recibidos, cargado } = useExpediente();
  const bloqueo = useBloqueoFormato(f.clave);
  const e0 = estadoFormato(f, ctx, firmados[f.clave], { confirmado: confirmados[f.clave], recibido: recibidos[f.clave] });
  const e = bloqueo && !e0.completo ? { ...e0, etiqueta: "Bloqueado", tono: "gris" as const } : e0;
  // El SIP-08 se comporta como editable cuando el asesor ya lo preparó
  const editable = f.llena === "aspirante" || (f.llena === "asesor" && !!recibidos[f.clave]);
  return (
<li className="flex flex-col rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-guinda">{f.codigo}</p>
            <p className="font-medium text-gray-900">{f.nombre}</p>
          </div>
          {cargado && (
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONOS[e.tono]}`}>{e.etiqueta}</span>
          )}
        </div>
        <p className="mt-1.5 flex-1 text-sm text-gray-600">{f.descripcion}</p>
        {editable && e.autollenados > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <Sparkles size={13} /> {e.autollenados} datos llenados automáticamente
          </p>
        )}
        {editable && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
            <Send size={12} /> Se envía a: {f.destino}
          </p>
        )}
        {f.pdf === "falta-plantilla" && (
          <p className="mt-2 text-xs text-amber-700">PDF pendiente: {f.notaPlantilla}</p>
        )}
        {bloqueo && <p className="mt-2 rounded bg-gray-50 px-2 py-1.5 text-xs text-gray-600">{bloqueo}</p>}
        <Link
          href={`/aspirante/formatos/${f.clave}`}
          className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
            !bloqueo && (editable || f.confirmaAspirante) && !e.completo && e.tono !== "gris"
              ? "bg-primary text-white hover:bg-primary-hover"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {bloqueo ? "Ver requisitos" : f.confirmaAspirante ? (e.completo ? "Descargar dictamen" : e.etiqueta === "Revisa tus datos" ? "Revisar y confirmar" : "Ver estado") : !editable ? "Ver detalle" : e.completo ? "Ver formato" : e.faltan ? "Completar datos" : e.firmaAspirante ? "Descargar y subir firmado" : "Revisar"}
          <ArrowRight size={15} />
        </Link>
      </li>
  );
}
