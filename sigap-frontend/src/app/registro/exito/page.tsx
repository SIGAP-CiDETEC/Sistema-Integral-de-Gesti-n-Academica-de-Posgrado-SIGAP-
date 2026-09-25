import Link from "next/link";
import { CircleCheck, Mail } from "lucide-react";
import { Logos } from "@/components/Logos";

/** Registro exitoso: muestra el ID temporal generado (RF-02). */
export default async function RegistroExito({ searchParams }: PageProps<"/registro/exito">) {
  const { id, correo } = await searchParams;
  const idTemporal = typeof id === "string" ? id : "ASP-2026-001";
  const email = typeof correo === "string" && correo ? correo : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logos size={48} />
        </div>
        <CircleCheck size={48} strokeWidth={1.5} className="mx-auto mt-6 text-emerald-600" />
        <h1 className="mt-3 text-xl font-semibold text-gray-900">¡Bienvenida/o al proceso de admisión!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tu solicitud fue creada correctamente. Conserva tu identificador temporal: lo usarás para iniciar
          sesión hasta que se formalice tu matrícula y se emita tu boleta definitiva.
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">ID temporal</p>
          <p className="mt-1 text-3xl font-bold tracking-wide text-guinda">{idTemporal}</p>
          {email && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs text-primary">
              <Mail size={13} /> Enviamos tus credenciales a {email}
            </p>
          )}
        </div>

        <Link
          href="/aspirante"
          className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Acceder al portal del aspirante
        </Link>
        <Link href="/" className="mt-3 inline-block text-sm text-gray-600 hover:text-gray-900">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
