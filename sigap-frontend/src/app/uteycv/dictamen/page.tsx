import { DictamenSip04 } from "@/components/uteycv/DictamenSip04";

export default async function Page({ searchParams }: PageProps<"/uteycv/dictamen">) {
  const { id } = await searchParams;
  return <DictamenSip04 inicial={typeof id === "string" ? id : undefined} />;
}
