import { notFound } from "next/navigation";
import { FormatoEditor } from "@/components/expediente/FormatoEditor";
import { FORMATOS, formatoPorClave } from "@/lib/formatos";

export function generateStaticParams() {
  return FORMATOS.map((f) => ({ clave: f.clave }));
}

/** Revisar, completar y firmar un formato oficial (autollenado con los datos del aspirante). */
export default async function FormatoPage({ params }: PageProps<"/aspirante/formatos/[clave]">) {
  const { clave } = await params;
  if (!formatoPorClave(clave)) notFound();
  return <FormatoEditor clave={clave} />;
}
