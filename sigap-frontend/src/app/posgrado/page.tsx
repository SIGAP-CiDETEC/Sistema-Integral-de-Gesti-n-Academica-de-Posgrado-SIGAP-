"use client";

import Link from "next/link";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, EtiquetaBandeja, Kpi, Tarjeta } from "@/components/posgrado/ui";
import { convocatoriaActual } from "@/lib/config";
import { bandejaDe, diasPara, fechaCorta, nombreProfesor, prioridadDe, prorrogasDe, type Bandeja } from "@/lib/posgrado/datos";

const BANDEJAS: { b: Bandeja; accion: string; href: string }[] = [
  { b: "Por revisar", accion: "Revisar", href: "/posgrado/aspirantes?bandeja=Por revisar" },
  { b: "Con observaciones", accion: "Dar seguimiento", href: "/posgrado/aspirantes?bandeja=Con observaciones" },
  { b: "Pendiente aval DFLE", accion: "Consultar", href: "/posgrado/aspirantes?bandeja=Pendiente aval DFLE" },
  { b: "Sin cita", accion: "Programar", href: "/posgrado/entrevistas" },
  { b: "Entrevista programada", accion: "Registrar dictamen", href: "/posgrado/entrevistas" },
  { b: "En evaluación", accion: "Gestionar", href: "/posgrado/evaluacion" },
  { b: "Segunda oportunidad", accion: "Gestionar", href: "/posgrado/evaluacion" },
  { b: "Esperando resolución del Colegio", accion: "Registrar resolución", href: "/posgrado/comision" },
  { b: "Turnado a UTEyCV", accion: "Ver", href: "/posgrado/aspirantes?bandeja=Turnado a UTEyCV" },
];

/** Operación de admisión: vista general de la convocatoria (mockup "Operación de admisión"). */
export default function PosgradoInicio() {
  const { aspirantes, cargado, usuario } = usePosgrado();
  if (!cargado) return null;
  const cuenta = (b: Bandeja) => aspirantes.filter((a) => bandejaDe(a) === b).length;
  const activos = aspirantes.filter((a) => !a.concluido);
  const prorrogas = aspirantes
    .filter((a) => !a.concluido)
    .flatMap((a) => prorrogasDe(a).map((d) => ({ a, d, dias: diasPara(d.prorrogaHasta!) })))
    .sort((x, y) => x.dias - y.dias);
  const altas = aspirantes.filter((a) => prioridadDe(a).nivel === "Alta").length;
  const inglesAval = aspirantes.filter((a) => !a.concluido && a.documentos.some((d) => d.id === "ingles" && d.estado === "aval"));
  const proximas = aspirantes
    .filter((a) => a.entrevista && !a.dictamen)
    .sort((x, y) => `${x.entrevista!.fecha}${x.entrevista!.hora}`.localeCompare(`${y.entrevista!.fecha}${y.entrevista!.hora}`));

  return (
    <>
      <PageHeader titulo="Operación de admisión" subtitulo={`${convocatoriaActual.nombre} · Hola, ${usuario}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={aspirantes.length} etiqueta="Solicitudes" color="text-guinda" href="/posgrado/aspirantes" />
        <Kpi valor={cuenta("Por revisar")} etiqueta="Expedientes por revisar" color="text-amber-600" href="/posgrado/aspirantes?bandeja=Por revisar" />
        <Kpi valor={cuenta("Sin cita") + cuenta("Entrevista programada")} etiqueta="En entrevista" color="text-primary" href="/posgrado/entrevistas" />
        <Kpi
          valor={aspirantes.filter((a) => a.etapa === "dictamen" || a.etapa === "matricula").length}
          etiqueta="Acreditados (comisión / UTEyCV)"
          color="text-emerald-700"
          href="/posgrado/comision"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Tarjeta titulo="Bandejas por estado">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Bandeja</th>
                  <th className="py-2 text-center font-medium">Aspirantes</th>
                  <th className="py-2 text-right font-medium">Atención</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {BANDEJAS.map(({ b, accion, href }) => (
                  <tr key={b}>
                    <td className="py-2.5">
                      <EtiquetaBandeja b={b} />
                    </td>
                    <td className="py-2.5 text-center font-medium text-gray-900">{cuenta(b)}</td>
                    <td className="py-2.5 text-right">
                      <Link href={href} className="text-primary hover:underline">
                        {accion}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {activos.length} en proceso · {cuenta("No admitido")} concluidos sin admisión
          </p>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarClock size={17} className="text-primary" /> Próximas entrevistas</span>}>
            {proximas.length ? (
              <ul className="space-y-3 text-sm">
                {proximas.map((a) => (
                  <li key={a.id}>
                    <Link href={`/posgrado/entrevistas/${a.id}`} className="font-medium text-gray-900 hover:text-primary">
                      {a.nombre}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {fechaCorta(a.entrevista!.fecha)} · {a.entrevista!.hora} h · {a.entrevista!.sala}
                    </p>
                    <p className="text-xs text-gray-500">Sínodo: {a.entrevista!.sinodo.map(nombreProfesor).join(", ")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No hay entrevistas pendientes de dictamen.</p>
            )}
          </Tarjeta>

          {inglesAval.length > 0 && (
            <Aviso tono="alerta" titulo={`Alerta operativa · ${inglesAval.length} constancia(s) de inglés sin aval`}>
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                UTEyCV las envió a la DFLE; no se puede aprobar el expediente hasta recibir el aval (RN-09), salvo que se dé prórroga.
              </p>
              <ul className="mt-1 list-disc pl-5">
                {inglesAval.map((a) => (
                  <li key={a.id}>
                    <Link href={`/posgrado/aspirantes/${a.id}`} className="underline">
                      {a.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
          {prorrogas.length > 0 && (
            <Aviso tono="alerta" titulo={`Documentos con prórroga · ${prorrogas.length}`}>
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                Siguen su proceso; deben entregarlos antes de la fecha límite.
              </p>
              <ul className="mt-1 space-y-0.5">
                {prorrogas.map(({ a, d, dias }) => (
                  <li key={a.id + d.id}>
                    <Link href={`/posgrado/aspirantes/${a.id}`} className="underline">
                      {a.nombre}
                    </Link>{" "}
                    · {d.nombre} · {dias < 0 ? <b>vencida</b> : dias <= 3 ? <b>vence en {dias} día(s)</b> : `vence el ${fechaCorta(d.prorrogaHasta!)}`}
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
          {altas > 0 && (
            <Link href="/posgrado/aspirantes?prioridad=Alta" className="block rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100">
              <b>{altas} aspirante(s) con prioridad alta</b> — ver en la bandeja
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
