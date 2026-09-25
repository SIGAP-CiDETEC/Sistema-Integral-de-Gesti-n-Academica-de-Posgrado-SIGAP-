"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useConvocatoria } from "@/lib/convocatoria";

/** El registro solo se habilita con la convocatoria activa (precondición CU-ADM-01, RF-81). */
export function RegistroSiActiva({ children }: { children: React.ReactNode }) {
  const { conv, cargada } = useConvocatoria();
  if (!cargada) return null;
  if (!conv.activa)
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

export function NombreConvocatoria() {
  return <>{useConvocatoria().conv.nombre}</>;
}
