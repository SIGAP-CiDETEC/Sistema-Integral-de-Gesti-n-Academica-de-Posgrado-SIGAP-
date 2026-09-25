import Link from "next/link";
import { Building2, Lock, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ETAPAS, type EtapaId } from "@/lib/admision";
import { AREAS } from "@/lib/config";
import { faseDe } from "@/lib/fases";

/** Encabezado común de cada fase: qué haces tú, qué hace cada área (Posgrado / UTEyCV) y de dónde sale (RF/CU). */
export function FaseEncabezado({ id }: { id: EtapaId }) {
  const f = faseDe(id);
  const areas = [...new Set(f.areasHacen.map((x) => x.area))];
  const titulo = areas.length === 1 ? `Lo que hace ${AREAS[areas[0]].corto}` : `Lo que hacen ${areas.map((a) => AREAS[a].corto).join(" y ")}`;
  return (
    <>
      <PageHeader titulo={f.titulo} subtitulo={`Fase ${f.numero} de ${ETAPAS.length} · ${f.resumen}`} />

      {/* Mini barra de fases */}
      <nav aria-label="Fases del proceso" className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {ETAPAS.map((e, i) => {
          const actual = e.id === id;
          return (
            <Link
              key={e.id}
              href={faseDe(e.id).href}
              aria-current={actual ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                actual ? "border-guinda bg-guinda text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {i + 1}. {e.label}
            </Link>
          );
        })}
      </nav>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserRound size={16} className="text-primary" /> Lo que haces tú
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {f.tuHaces.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Building2 size={16} className="text-guinda" /> {titulo}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
            {f.areasHacen.map(({ area, texto }) => (
              <li key={texto} className="flex items-start gap-2">
                <span
                  title={AREAS[area].nombre}
                  className={`mt-0.5 w-[62px] shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${
                    area === "uteycv" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-guinda"
                  }`}
                >
                  {AREAS[area].corto}
                </span>
                <span>{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {f.requisito && (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm text-navy-800">
          <Lock size={15} /> {f.requisito} <span className="text-xs text-gray-500">(En el cascarón todas las fases están abiertas.)</span>
        </p>
      )}
    </>
  );
}

export function FuenteFase({ id }: { id: EtapaId }) {
  return <p className="mt-8 text-xs text-gray-400">Referencia: {faseDe(id).fuente}</p>;
}
