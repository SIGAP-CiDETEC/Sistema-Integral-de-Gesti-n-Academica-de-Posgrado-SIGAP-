"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Kpi, Tarjeta } from "@/components/posgrado/ui";
import { estadoSip12, gruposSip12 } from "@/lib/actas-sip12";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";

/** Inicio del Coordinador del programa: actas SIP-12 por firmar. */
export default function CoordinadorInicio() {
  const { aspirantes, actasSip12, cargado } = usePosgrado();
  const { materias } = useConfigEvaluacion();
  if (!cargado) return null;
  const estados = gruposSip12(aspirantes, materias).map((g) => estadoSip12(g, actasSip12[g.clave]));
  const n = (e: string) => estados.filter((x) => x === e).length;

  return (
    <>
      <PageHeader titulo="Coordinación del programa" subtitulo="Firma de las actas de los cursos propedéuticos (SIP-12)" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi valor={n("Por firmar (Coordinador)")} etiqueta="Actas por firmar" color="text-amber-700" href="/coordinador/actas" />
        <Kpi valor={n("Firmada")} etiqueta="Actas firmadas" color="text-emerald-700" href="/coordinador/actas" />
        <Kpi valor={n("Por firmar (docente)") + n("Calificaciones pendientes")} etiqueta="Esperando al docente" color="text-gray-600" href="/coordinador/actas" />
      </div>
      <Tarjeta className="mt-6" titulo="¿Qué hace el Coordinador en SIGAP?">
        <p className="text-sm text-gray-600">
          Cuando el docente de un grupo sube su acta SIP-12 firmada, la descargas, la firmas y subes la versión con tu firma. Es lo único que se hace desde esta
          cuenta.
        </p>
        <Link href="/coordinador/actas" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Ir a las actas <ArrowRight size={14} />
        </Link>
      </Tarjeta>
    </>
  );
}
