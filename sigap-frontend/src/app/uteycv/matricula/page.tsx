import { Matricula } from "@/components/uteycv/Matricula";

export default async function Page({ searchParams }: PageProps<"/uteycv/matricula">) {
  const { id } = await searchParams;
  return <Matricula inicial={typeof id === "string" ? id : undefined} />;
}
