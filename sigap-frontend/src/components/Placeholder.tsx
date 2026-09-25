import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";

/** Pantalla provisional mientras se construye cada pestaña. */
export function Placeholder({
  titulo,
  subtitulo,
  contenido,
}: {
  titulo: string;
  subtitulo?: string;
  /** Lista de lo que irá en esta pantalla (según mockups / RF) */
  contenido: string[];
}) {
  return (
    <>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
          <Construction size={18} /> Pantalla en construcción
        </div>
        <p className="mt-3 text-sm text-gray-600">Aquí irá:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {contenido.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
