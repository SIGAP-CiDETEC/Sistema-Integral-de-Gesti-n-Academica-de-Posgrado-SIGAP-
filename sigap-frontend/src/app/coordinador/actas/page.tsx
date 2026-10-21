"use client";

import { PageHeader } from "@/components/PageHeader";
import { ActasSip12 } from "@/components/actas/ActasSip12";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Regresar, Tarjeta } from "@/components/posgrado/ui";
import { estadoSip12, gruposSip12 } from "@/lib/actas-sip12";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";

const ORDEN = ["Por firmar (Coordinador)", "Por firmar (docente)", "Calificaciones pendientes", "Firmada"];

/** Actas SIP-12 de todos los grupos del propedéutico: el Coordinador firma las que ya subió el docente. */
export default function ActasCoordinador() {
  const { aspirantes, actasSip12, cargado } = usePosgrado();
  const { materias, modalidades } = useConfigEvaluacion();
  if (!cargado) return null;
  const grupos = gruposSip12(aspirantes, materias).sort(
    (a, b) => ORDEN.indexOf(estadoSip12(a, actasSip12[a.clave])) - ORDEN.indexOf(estadoSip12(b, actasSip12[b.clave])),
  );
  return (
    <>
      <Regresar href="/coordinador" t="Inicio" />
      <PageHeader titulo="Actas SIP-12" subtitulo={`Actas grupales de evaluación de los cursos propedéuticos · ${modalidades.propedeutico.fechas}`} />
      <Tarjeta>
        <p className="mb-1 text-sm text-gray-600">Descarga el acta que firmó el docente, fírmala y sube el PDF escaneado con tu firma.</p>
        <ActasSip12 modo="coordinador" grupos={grupos} />
      </Tarjeta>
    </>
  );
}
