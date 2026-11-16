"use client";

import Link from "next/link";
import { Bell, CheckCircle2, ChevronRight, CircleDot, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso } from "@/components/posgrado/ui";
import { FASES } from "@/lib/fases";
import { fechaLargaIso } from "@/lib/evaluacion-config";
import { usePortal, type PestanaPortal, type YoPortal } from "@/lib/portal";
import { Cargando } from "./PortalComun";

type Paso = { estado: "hecho" | "pendiente" | "bloqueado" | "info"; texto: string };

/** Cómo va cada fase del aspirante (el detalle está en cada pestaña). */
function paso(id: PestanaPortal, yo: YoPortal): Paso {
  const abierta = yo.pestanas.includes(id);
  switch (id) {
    case "registro":
      return yo.enLinea || yo.verificadoEl ? { estado: "hecho", texto: yo.enLinea ? "Registro en línea completo" : "Datos confirmados" } : { estado: "pendiente", texto: "Verifica que tus datos sean correctos" };
    case "documentos":
      if (yo.documentos.observados) return { estado: "pendiente", texto: `${yo.documentos.observados} con observaciones: corrígelos y vuelve a subirlos` };
      if (yo.documentos.faltan) return { estado: "pendiente", texto: `Te ${yo.documentos.faltan === 1 ? "falta 1 documento" : `faltan ${yo.documentos.faltan} documentos`} (puedes seguir con tu proceso)` };
      return { estado: "hecho", texto: "Documentos entregados" };
    case "entrevista":
      if (!abierta) return { estado: "bloqueado", texto: "Cuando Posgrado publique tu cita" };
      return yo.entrevista ? { estado: "info", texto: `${fechaLargaIso(yo.entrevista.fecha)}, ${yo.entrevista.hora} h` } : { estado: "hecho", texto: "Entrevista concluida" };
    case "evaluacion":
      if (!abierta) return { estado: "bloqueado", texto: "Cuando concluya tu entrevista colegiada" };
      if (yo.eleccion) return { estado: "hecho", texto: yo.eleccion.modalidad === "propedeutico" ? "Elegiste cursos propedéuticos" : "Elegiste presentar el examen" };
      return yo.puedeElegir ? { estado: "pendiente", texto: "Elige cursos propedéuticos o examen" } : { estado: "info", texto: yo.motivo ?? "Pronto podrás elegir" };
    case "resultados":
      return abierta ? { estado: "info", texto: "Resultados publicados" } : { estado: "bloqueado", texto: "Cuando Posgrado los publique" };
    case "dictamen":
      return abierta ? { estado: "info", texto: "Dictamen publicado" } : { estado: "bloqueado", texto: "Al terminar tu evaluación" };
    default:
      return { estado: "info", texto: "" };
  }
}

const ICONO = { hecho: CheckCircle2, pendiente: CircleDot, bloqueado: Lock, info: CircleDot };
const TONO = { hecho: "text-emerald-600", pendiente: "text-amber-600", bloqueado: "text-gray-400", info: "text-primary" };

/** Inicio del aspirante (servidor real): avance de su proceso y la información que publica Posgrado. */
export function InicioServidor({ contenido }: { contenido: React.ReactNode }) {
  const { yo, error } = usePortal();
  if (!yo) return <Cargando error={error} />;
  const fases = FASES.filter((f) => !f.aparte && f.id !== "inscripcion");
  return (
    <>
      <PageHeader titulo={`Hola, ${yo.nombre.split(" ")[0]}`} subtitulo={`ID temporal ${yo.idTemporal} · Maestría en Tecnología de Cómputo`} />

      {yo.concluido && (
        <div className="mb-5">
          <Aviso tono="info" titulo="Tu proceso de admisión en esta convocatoria concluyó">
            Consulta tus notificaciones para más información.
          </Aviso>
        </div>
      )}
      {yo.noLeidas > 0 && (
        <Link href="/aspirante/notificaciones" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-navy-800 hover:bg-indigo-100">
          <span className="flex items-center gap-2">
            <Bell size={16} /> Tienes {yo.noLeidas === 1 ? "1 notificación nueva" : `${yo.noLeidas} notificaciones nuevas`}
          </span>
          <ChevronRight size={16} />
        </Link>
      )}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Tu proceso de admisión</h2>
        <ol className="divide-y divide-gray-100">
          {fases.map((f) => {
            const id = f.id as PestanaPortal;
            const p = paso(id, yo);
            const Icono = ICONO[p.estado];
            const fila = (
              <>
                <Icono size={18} className={`shrink-0 ${TONO[p.estado]}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${p.estado === "bloqueado" ? "text-gray-500" : "text-gray-900"}`}>
                    {f.numero}. {f.titulo}
                  </span>
                  <span className={`block text-xs ${p.estado === "pendiente" ? "font-medium text-amber-700" : "text-gray-500"}`}>{p.texto}</span>
                </span>
                {p.estado !== "bloqueado" && <ChevronRight size={16} className="text-gray-400" />}
              </>
            );
            return (
              <li key={f.id}>
                {p.estado === "bloqueado" ? (
                  <div className="flex items-center gap-3 px-5 py-3">{fila}</div>
                ) : (
                  <Link href={f.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    {fila}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {contenido}
    </>
  );
}
