import { ListaAspirantes } from "@/components/subdireccion/ListaAspirantes";

/** Lista de aspirantes (solo consulta). ?fase=<fase> llega filtrada desde el inicio. */
export default async function Page({ searchParams }: PageProps<"/subdireccion/aspirantes">) {
  const { fase } = await searchParams;
  return <ListaAspirantes faseInicial={typeof fase === "string" ? fase : ""} />;
}
