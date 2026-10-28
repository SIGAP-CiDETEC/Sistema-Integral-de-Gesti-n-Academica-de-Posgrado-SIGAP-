import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logos } from "@/components/Logos";
import { RegistroWizard } from "@/components/registro/RegistroWizard";
import { PeriodoEscolar } from "@/components/PeriodoEscolar";
import { NombreConvocatoria, RegistroSiActiva } from "@/components/registro/RegistroSiActiva";

/**
 * Registro inicial del aspirante (CU-ADM-01 / RF-01). Solo con convocatoria activa.
 * ?convocatoria=A|B preselecciona el semestre de ingreso elegido en el inicio.
 */
export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const { convocatoria } = await searchParams;
  const id = convocatoria === "A" || convocatoria === "B" ? convocatoria : undefined;
  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logos size={44} onDark />
          <Link href="/" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Volver al</span> inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl text-gray-900 sm:text-3xl">Registro inicial</h1>
            <p className="mt-1 text-sm text-gray-500">
              <NombreConvocatoria id={id} /> · Completa tus datos para crear tu expediente
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-navy-800">
            Periodo escolar <PeriodoEscolar />
          </span>
        </div>

        <RegistroSiActiva>
          <RegistroWizard convocatoria={id} />
        </RegistroSiActiva>
      </main>
    </div>
  );
}
