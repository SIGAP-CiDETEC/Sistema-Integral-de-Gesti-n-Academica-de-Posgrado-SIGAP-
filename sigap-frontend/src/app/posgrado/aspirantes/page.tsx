import { BandejaAspirantes } from "@/components/posgrado/BandejaAspirantes";

/** Bandeja de aspirantes: ?bandeja=<estado> o ?prioridad=<nivel> llegan filtradas desde el Inicio. */
export default async function Page({ searchParams }: PageProps<"/posgrado/aspirantes">) {
  const { bandeja, prioridad } = await searchParams;
  return (
    <BandejaAspirantes
      inicial={typeof bandeja === "string" ? bandeja : undefined}
      prioridadInicial={typeof prioridad === "string" ? prioridad : undefined}
    />
  );
}
