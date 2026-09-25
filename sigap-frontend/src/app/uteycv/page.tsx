"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Kpi, Tarjeta } from "@/components/posgrado/ui";
import { convocatoriaActual } from "@/lib/config";
import { TONO_UTEYCV, diasPara, estadoUteycv, fechaCorta, prorrogasDe } from "@/lib/posgrado/datos";

/** Inicio de Control Escolar (UTEyCV) en el proceso de admisión. */
export default function UteycvInicio() {
  const { aspirantes, cargado, usuario } = usePosgrado();
  if (!cargado) return null;
  const activos = aspirantes.filter((a) => !a.concluido);
  const porAvalar = activos.filter((a) => a.documentos.some((d) => d.id === "ingles" && d.estado === "aval"));
  const cartas = activos.filter((a) => a.formatos["sip-05"] && a.formatos["sip-06"] && !a.uteycv?.cartasValidadasEl);
  const turnados = aspirantes.filter((a) => a.etapa === "matricula");
  const estados = turnados.map((a) => estadoUteycv(a));
  const prorrogas = turnados.flatMap((a) => prorrogasDe(a).map((d) => ({ a, d, dias: diasPara(d.prorrogaHasta!) })));

  return (
    <>
      <PageHeader titulo="Control Escolar · Admisión" subtitulo={`${convocatoriaActual.nombre} · Hola, ${usuario}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={porAvalar.length} etiqueta="Constancias de inglés por avalar (DFLE)" color="text-amber-600" href="/uteycv/ingles" />
        <Kpi valor={cartas.length} etiqueta="Cartas SIP-05/06 por validar" color="text-primary" href="/uteycv/cartas" />
        <Kpi valor={estados.filter((e) => e !== "Integrando expediente" && e !== "Listo para formalizar" && e !== "Matrícula formalizada").length} etiqueta="Dictámenes SIP-04 en proceso" color="text-guinda" href="/uteycv/dictamen" />
        <Kpi valor={estados.filter((e) => e === "Matrícula formalizada").length} etiqueta={`Matrículas formalizadas de ${turnados.length}`} color="text-emerald-700" href="/uteycv/matricula" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Tarjeta titulo="Aspirantes turnados por Posgrado">
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
                  const e = estadoUteycv(a);
                  const enDictamen = !["Integrando expediente", "Listo para formalizar", "Matrícula formalizada"].includes(e);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {a.id} · turnado {a.turnadoUteycv ? fechaCorta(a.turnadoUteycv) : ""}
                        </p>
                      </td>
                      <td className="py-2.5 text-gray-700">{a.resolucion}</td>
                      <td className="py-2.5">
                        <Etiqueta tono={TONO_UTEYCV[e]}>{e}</Etiqueta>
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`${enDictamen ? "/uteycv/dictamen" : "/uteycv/matricula"}?id=${a.id}`} className="text-primary hover:underline">
                          {enDictamen ? "SIP-04" : e === "Matrícula formalizada" ? "Ver" : "Matrícula"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!turnados.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Posgrado aún no turna aspirantes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <div className="space-y-6">
          {porAvalar.length > 0 && (
            <Aviso tono="alerta" titulo={`${porAvalar.length} constancia(s) de inglés esperan el aval de la DFLE`}>
              <ul className="mt-1 list-disc pl-5">
                {porAvalar.map((a) => (
                  <li key={a.id}>
                    {a.nombre} {a.uteycv?.avalEnviadoEl ? `· enviada el ${fechaCorta(a.uteycv.avalEnviadoEl)}` : "· sin enviar"}
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
          {prorrogas.length > 0 && (
            <Aviso tono="info" titulo="Documentos en prórroga de aspirantes turnados">
              <p className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Verifícalos antes de formalizar la matrícula.
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
