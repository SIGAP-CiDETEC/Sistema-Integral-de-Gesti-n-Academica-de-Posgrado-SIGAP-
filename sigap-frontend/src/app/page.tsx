import { InicioPublico } from "@/components/InicioPublico";

/** Inicio público. Para ver el estado "cerrada" en el cascarón: /?convocatoria=cerrada */
export default async function Page({ searchParams }: PageProps<"/">) {
  const { convocatoria } = await searchParams;
  return <InicioPublico forzarCerrada={convocatoria === "cerrada"} />;
}
