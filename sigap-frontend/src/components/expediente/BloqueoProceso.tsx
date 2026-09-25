"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info } from "lucide-react";
import { useEstadoAdmision } from "@/lib/posgrado/revision";

/** Pantallas que el aspirante puede seguir consultando aunque su proceso haya concluido. */
const SIEMPRE = ["/aspirante", "/aspirante/admision", "/aspirante/notificaciones"];

/**
 * RF-14, RN-05 y RN-08: si el proceso concluyó sin admisión, el aspirante ya no puede avanzar.
 * Solo ve un aviso general (RF-17: no se le muestra "Rechazado" ni los puntajes).
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
    </section>
  );
}
