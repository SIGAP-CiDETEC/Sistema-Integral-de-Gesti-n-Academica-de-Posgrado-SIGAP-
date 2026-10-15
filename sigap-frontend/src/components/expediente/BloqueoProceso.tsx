"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, RotateCcw } from "lucide-react";
import { guardarCuenta } from "@/lib/cuenta-alumno";
import { deshacerConclusion, useEstadoAdmision } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";

/** Pantallas que el aspirante puede seguir consultando aunque su proceso haya concluido. */
const SIEMPRE = ["/aspirante", "/aspirante/admision", "/aspirante/notificaciones"];

/**
 * RF-14, RN-05 y RN-08: si el proceso concluyó sin admisión, el aspirante ya no puede avanzar.
 * Solo ve un aviso general (RF-17: no se le muestra "Rechazado").
 */
export function BloqueoProceso({ children }: { children: React.ReactNode }) {
  const { concluido } = useEstadoAdmision();
  const ruta = usePathname();
  if (!concluido || SIEMPRE.includes(ruta)) return <>{children}</>;
  return <AvisoConclusion motivo={concluido} />;
}

export function AvisoConclusion({ motivo }: { motivo: string }) {
  const porEvaluacion = /evaluaci/i.test(motivo);
  return (
    <section className="mx-auto mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center">
      <Info size={28} className="mx-auto text-primary" />
      <h1 className="mt-3 text-lg font-semibold text-gray-900">Tu proceso de admisión ha concluido</h1>
      <p className="mt-2 text-sm text-gray-600">
        {porEvaluacion
          ? "Agradecemos tu participación. Te invitamos a participar en la próxima convocatoria de la Maestría en Tecnología de Cómputo."
          : "Agradecemos tu interés en la Maestría en Tecnología de Cómputo. Te enviamos un correo con la información de tu proceso."}
      </p>
      <p className="mt-2 text-xs text-gray-500">Ya no es posible subir documentos ni llenar formatos en esta convocatoria.</p>
      <Link href="/aspirante/notificaciones" className="mt-4 inline-block text-sm text-primary underline">
        Ver mis notificaciones
      </Link>
      <DeshacerConclusion />
    </section>
  );
}

/** Solo cascarón: salir de la simulación cuando el proceso quedó concluido. */
export function DeshacerConclusion() {
  const { concluido } = useEstadoAdmision();
  const { evaluacion, guardarEvaluacion } = useExpediente();
  const decidioNo = evaluacion.segundaOportunidad?.decision === "no";
  if (!concluido && !decidioNo) return null;
  return (
    <div className="mt-5 border-t border-dashed border-gray-300 pt-4 text-left">
      <p className="text-xs text-gray-500">Vista de prueba (solo cascarón):</p>
      <button
        type="button"
        onClick={() => {
          deshacerConclusion();
          // Si quedó un número de registro de otra prueba, ya no corresponde
          guardarCuenta(null);
          // La decisión de no presentar el examen se guarda en la sesión del aspirante
          if (decidioNo) guardarEvaluacion({ segundaOportunidad: undefined });
        }}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        <RotateCcw size={12} /> Deshacer la conclusión y volver al paso anterior
      </button>
      <p className="mt-1 text-xs text-gray-500">
        {/entrevista/i.test(concluido ?? "")
          ? "Regresa a la entrevista, sin acta, para que el sínodo vuelva a dictaminar."
          : /Colegio/i.test(concluido ?? "")
            ? "Regresa a la Comisión para que se registre otra resolución."
            : "Quita el resultado no acreditado para que puedas volver a simularlo."}
      </p>
    </div>
  );
}
