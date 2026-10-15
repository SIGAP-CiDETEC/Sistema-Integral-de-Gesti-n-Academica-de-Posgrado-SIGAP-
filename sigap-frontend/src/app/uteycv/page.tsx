"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Kpi, Tarjeta } from "@/components/posgrado/ui";
import { convocatoriaActual } from "@/lib/config";
import { TONO_INSCRIPCION, diasPara, estadoInscripcion, fechaCorta, prorrogasDe, puedeInscribirse } from "@/lib/posgrado/datos";

/** Inicio de Control Escolar (UTEyCV): inscripción de los admitidos por el Colegio. */
export default function UteycvInicio() {
  const { aspirantes, cargado, usuario } = usePosgrado();
  if (!cargado) return null;
  const turnados = aspirantes.filter(puedeInscribirse);
  const inscripcion = turnados.map((a) => estadoInscripcion(a));
  const prorrogas = turnados.flatMap((a) => prorrogasDe(a).map((d) => ({ a, d, dias: diasPara(d.prorrogaHasta!) })));

  return (
    <>
      <PageHeader titulo="Control Escolar · Inscripción" subtitulo={`${convocatoriaActual.nombre} · Hola, ${usuario}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={turnados.length} etiqueta="Admitidos por el Colegio" color="text-guinda" href="/uteycv/inscripciones" />
        <Kpi valor={inscripcion.filter((e) => e === "SIP-08 por publicar").length} etiqueta="SIP-08 por elaborar" color="text-amber-700" href="/uteycv/inscripciones" />
        <Kpi valor={inscripcion.filter((e) => e !== "Inscrito").length} etiqueta="Inscripciones por formalizar" color="text-primary" href="/uteycv/inscripciones" />
        <Kpi valor={inscripcion.filter((e) => e === "Inscrito").length} etiqueta="Inscritos con número SICEP" color="text-emerald-700" href="/uteycv/inscripciones" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Tarjeta titulo="Aspirantes admitidos por el Colegio">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Aspirante</th>
                  <th className="py-2 font-medium">Resolución</th>
                  <th className="py-2 font-medium">Estado</th>
                  <th className="py-2 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {turnados.map((a) => {
                  const ins = estadoInscripcion(a);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {a.id}
                          {a.turnadoUteycv ? ` · admitido el ${fechaCorta(a.turnadoUteycv)}` : ""}
                        </p>
                      </td>
                      <td className="py-2.5 text-gray-700">{a.resolucion}</td>
                      <td className="py-2.5">
                        <Etiqueta tono={TONO_INSCRIPCION[ins]}>{ins === "Inscrito" ? `Inscrito · ${a.uteycv?.sicep}` : ins}</Etiqueta>
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`/uteycv/inscripciones?id=${a.id}`} className="text-primary hover:underline">
                          Inscripción
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!turnados.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Aún no hay aspirantes admitidos por el Colegio de Profesores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <div className="space-y-6">
          {prorrogas.length > 0 && (
            <Aviso tono="info" titulo="Documentos en prórroga de admitidos">
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Verifícalos antes de formalizar la inscripción.
              </p>
              <ul className="mt-1 space-y-0.5">
                {prorrogas.map(({ a, d, dias }) => (
                  <li key={a.id + d.id}>
                    {a.nombre} · {d.nombre} · {dias < 0 ? <b>vencida</b> : `vence el ${fechaCorta(d.prorrogaHasta!)}`}
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
        </div>
      </div>
    </>
  );
}
