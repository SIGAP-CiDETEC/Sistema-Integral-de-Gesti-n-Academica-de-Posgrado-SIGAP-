import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TONO_BANDEJA, fechaCorta, type Bandeja, type EstadoDoc } from "@/lib/posgrado/datos";

export function Etiqueta({ children, tono = "bg-gray-100 text-gray-700" }: { children: React.ReactNode; tono?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tono}`}>{children}</span>;
}

export const EtiquetaBandeja = ({ b }: { b: Bandeja }) => <Etiqueta tono={TONO_BANDEJA[b]}>{b}</Etiqueta>;

const DOC: Record<EstadoDoc, { t: string; c: string }> = {
  falta: { t: "Sin archivo", c: "bg-gray-100 text-gray-600" },
  pendiente: { t: "Por revisar", c: "bg-amber-50 text-amber-800" },
  aprobado: { t: "Aprobado", c: "bg-emerald-50 text-emerald-700" },
  observado: { t: "Observado", c: "bg-orange-50 text-orange-800" },
  aval: { t: "Pendiente aval DFLE", c: "bg-yellow-50 text-yellow-800" },
  prorroga: { t: "Con prórroga", c: "bg-sky-50 text-sky-800" },
};
export const EtiquetaDoc = ({ e, hasta }: { e: EstadoDoc; hasta?: string }) => (
  <Etiqueta tono={DOC[e].c}>{e === "prorroga" && hasta ? `Prórroga al ${fechaCorta(hasta)}` : DOC[e].t}</Etiqueta>
);

export function Tarjeta({ titulo, accion, children, className = "" }: { titulo?: React.ReactNode; accion?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="font-semibold text-gray-900">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ valor, etiqueta, color, href }: { valor: number | string; etiqueta: string; color: string; href?: string }) {
  const cuerpo = (
    <>
      <p className={`text-3xl font-semibold ${color}`}>{valor}</p>
      <p className="mt-1 text-sm text-gray-600">{etiqueta}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm">
      {cuerpo}
    </Link>
  ) : (
    <div className="rounded-xl border border-gray-200 bg-white p-4">{cuerpo}</div>
  );
}

export function Progreso({ pct, texto }: { pct: number; texto: string }) {
  return (
    <div className="min-w-[110px]">
      <p className="text-xs text-gray-600">{texto}</p>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-guinda" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Migas({ items }: { items: { t: string; href?: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500">
      {items.map((x, i) => (
        <span key={x.t} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} />}
          {x.href ? (
            <Link href={x.href} className="hover:text-gray-900">
              {x.t}
            </Link>
          ) : (
            <span className="text-gray-900">{x.t}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Aviso({ tono, titulo, children }: { tono: "info" | "alerta" | "error" | "exito"; titulo: string; children?: React.ReactNode }) {
  const c = {
    info: "border-indigo-100 bg-indigo-50/70 text-navy-800",
    alerta: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tono];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${c}`}>
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-0.5 opacity-90">{children}</div>}
    </div>
  );
}

export const inputBase =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
export const botonPrimario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300";
export const botonSecundario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
export const botonPeligro =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300";
