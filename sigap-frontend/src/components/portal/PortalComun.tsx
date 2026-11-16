"use client";

import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso } from "@/components/posgrado/ui";
import { faseDe } from "@/lib/fases";
import { usePortal, type PestanaPortal, type YoPortal } from "@/lib/portal";

export function Cargando({ error }: { error?: string }) {
  return error ? (
    <Aviso tono="error" titulo="No se pudo cargar tu información">
      {error}
    </Aviso>
  ) : (
    <p className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 size={15} className="animate-spin" /> Cargando…
    </p>
  );
}

const REQUISITO: Partial<Record<PestanaPortal, string>> = {
  entrevista: "Se habilita cuando el Departamento de Posgrado publique tu cita para la entrevista colegiada.",
  evaluacion: "Se habilita cuando concluya tu entrevista colegiada y el Departamento de Posgrado registre su dictamen.",
  resultados: "Se habilita cuando el Departamento de Posgrado publique tus resultados.",
  dictamen: "Se habilita cuando se publique el dictamen final de la Comisión de Admisión.",
};

/** Muestra la pantalla solo si esa pestaña ya está habilitada para el aspirante (se habilitan conforme avanza). */
export function ConPestana({ id, children }: { id: PestanaPortal; children: (yo: YoPortal) => React.ReactNode }) {
  const { yo, error } = usePortal();
  if (!yo) return <Cargando error={error} />;
  if (!yo.pestanas.includes(id)) {
    const f = id === "inicio" || id === "notificaciones" ? null : faseDe(id);
    return (
      <>
        <PageHeader titulo={f?.titulo ?? "Sección"} />
        <section className="mx-auto mt-6 max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center">
          <Lock size={26} className="mx-auto text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900">Esta sección aún no está disponible</p>
          <p className="mt-1 text-sm text-gray-600">{REQUISITO[id] ?? "Se habilita conforme avanza tu proceso de admisión."}</p>
          <Link href="/aspirante" className="mt-4 inline-block text-sm text-primary underline">
            Volver al inicio
          </Link>
        </section>
      </>
    );
  }
  return <>{children(yo)}</>;
}

export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" });
export const fechaHoraCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
