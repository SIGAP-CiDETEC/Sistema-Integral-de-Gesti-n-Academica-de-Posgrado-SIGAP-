import { Inscripciones } from "@/components/uteycv/Inscripciones";

/** Inscripciones de los admitidos (?id=ASP-… abre a uno en particular). */
export default async function Page({ searchParams }: PageProps<"/uteycv/inscripciones">) {
  const { id } = await searchParams;
  return <Inscripciones inicial={typeof id === "string" ? id : undefined} />;
}
