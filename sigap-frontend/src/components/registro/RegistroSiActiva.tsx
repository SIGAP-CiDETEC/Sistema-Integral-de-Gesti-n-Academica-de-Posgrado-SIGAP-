"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useConvocatorias } from "@/lib/convocatoria";

/** El registro solo se habilita con alguna convocatoria (A o B) activa (precondición CU-ADM-01, RF-81). */
export function RegistroSiActiva({ children }: { children: React.ReactNode }) {
  const { activas, cargada } = useConvocatorias();
  if (!cargada) return null;
  if (!activas.length)
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Lock size={26} className="mx-auto text-gray-400" />
        <p className="mt-3 font-semibold text-gray-900">Sin convocatoria activa</p>
        <p className="mt-1 text-sm text-gray-600">El registro se habilita cuando se publica una convocatoria.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">
          Volver al inicio
        </Link>
      </div>
    );
  return <>{children}</>;
}

/** Nombre de la convocatoria elegida en el inicio (o de las que estén abiertas). */
export function NombreConvocatoria({ id }: { id?: string }) {
  const { activas } = useConvocatorias();
  const elegida = activas.find((c) => c.id === id);
  if (elegida) return <>{elegida.nombre}</>;
  return <>{activas.map((c) => c.nombre).join(" y ") || "Registro de aspirantes"}</>;
}
