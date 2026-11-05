"use client";

import { FileText, Paperclip } from "lucide-react";
import { ArchivoServidor } from "@/components/ArchivoServidor";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Regresar, Tarjeta } from "@/components/posgrado/ui";
import { DescargarActa, TEXTO_CONTINUAR } from "@/components/profesor/ActaVista";
import { MODO_API } from "@/lib/api";
import { actaPorValidar, fechaCorta, nombreProfesor } from "@/lib/posgrado/datos";
import { ValidarActaFirmada } from "@/components/posgrado/ValidarActaFirmada";

const TONO_ENTREVISTA = { Aprobado: "bg-emerald-50 text-emerald-700", "Con reservas": "bg-amber-50 text-amber-800", Rechazado: "bg-red-50 text-red-700" } as const;

/**
 * Dictamen de entrevista colegiada: actas MTC-EC que llenaron los profesores entrevistadores y que subieron firmadas
 * por los 3. Es distinto del dictamen final del proceso de admisión (Comisión y dictamen final).
 */
export default function DictamenEntrevistaColegiada() {
  const { aspirantes, cargado } = usePosgrado();
  if (!cargado) return null;
  const lista = aspirantes
    .filter((a) => a.actaEntrevista || a.dictamen)
    // Primero las que hay que validar, luego las que faltan por subir y al final las que ya tienen dictamen
    .sort((x, y) => (actaPorValidar(x) ? 0 : x.dictamen ? 2 : 1) - (actaPorValidar(y) ? 0 : y.dictamen ? 2 : 1) || x.nombre.localeCompare(y.nombre, "es"));
  const conDictamen = lista.filter((a) => a.dictamen).length;
  const porValidar = lista.filter(actaPorValidar).length;

  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Dictamen de entrevista colegiada" subtitulo="Actas MTC-EC firmadas por los profesores entrevistadores y el dictamen de cada entrevista" />
      <Tarjeta
        titulo={
          <span className="flex items-center gap-2">
            <FileText size={17} className="text-primary" /> Actas de entrevista colegiada (MTC-EC)
          </span>
        }
        accion={
          <span className="text-xs text-gray-500">
            {porValidar} por validar · {conDictamen} con dictamen · {lista.length - conDictamen - porValidar} por subir firmada
          </span>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          El dictamen de la entrevista lo emiten los profesores entrevistadores: un profesor llena el acta, los tres la firman y uno la sube firmada. Posgrado revisa que traiga las 3
          firmas y, al validarla, se aplica el dictamen; si falta alguna, la rechaza y los profesores la vuelven a subir. Este dictamen es distinto del dictamen final del proceso de
          admisión.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-2 py-2 font-medium">Aspirante</th>
                <th className="px-2 py-2 font-medium">Profesores entrevistadores</th>
                <th className="px-2 py-2 font-medium">Acta firmada</th>
                <th className="px-2 py-2 font-medium">Dictamen de entrevista</th>
                <th className="px-2 py-2 font-medium">Observaciones</th>
                <th className="px-2 py-2 text-right font-medium">Acta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const acta = a.actaEntrevista;
                return (
                  <tr key={a.id} data-acta={a.id}>
                    <td className="px-2 py-2.5">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">{a.id}</p>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-600">{a.entrevista?.sinodo.map(nombreProfesor).join(", ") ?? "—"}</td>
                    <td className="px-2 py-2.5 text-xs text-gray-700">
                      {acta?.firmada && actaPorValidar(a) ? (
                        <ValidarActaFirmada a={a} compacto />
                      ) : acta?.firmada ? (
                        <>
                          <span className="flex items-center gap-1 text-emerald-700">
                            <Paperclip size={12} /> {acta.firmada.archivo}
                          </span>
                          <span className="block text-gray-500">
                            Subida por {nombreProfesor(acta.firmada.subidaPor)} el {fechaCorta(acta.firmada.el)}
                          </span>
                          {acta.firmada.validada && <span className="block text-emerald-700">Validada por {acta.firmada.validada.por} el {fechaCorta(acta.firmada.validada.el)}</span>}
                          {MODO_API && <ArchivoServidor ruta={`/aspirantes/${a.id}/acta/firmada`} texto="Ver acta firmada" />}
                        </>
                      ) : acta ? (
                        <span className="text-amber-700">
                          Llenada por {nombreProfesor(acta.capturadaPor)} · {acta.descargada ? "descargada para firmarse" : "aún no se descarga"} · falta subirla firmada
                          {acta.rechazoFirmada && <span className="block text-red-700">Rechazaste la anterior el {fechaCorta(acta.rechazoFirmada.el)}: {acta.rechazoFirmada.motivo}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-500">Registrada antes de SIGAP (ejemplo)</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      {a.dictamen ? (
                        <Etiqueta tono={TONO_ENTREVISTA[a.dictamen.resolucion]}>{a.dictamen.resolucion}</Etiqueta>
                      ) : actaPorValidar(a) ? (
                        <Etiqueta tono="bg-sky-50 text-sky-800">Por validar</Etiqueta>
                      ) : (
                        <Etiqueta>Pendiente</Etiqueta>
                      )}
                    </td>
                    <td className="max-w-[260px] px-2 py-2.5 text-xs text-gray-700" data-observaciones>
                      {acta ? (
                        <>
                          <span className="block font-medium text-gray-900">¿Continuar proceso de admisión? {TEXTO_CONTINUAR[acta.resolucion]}</span>
                          <span className="block break-words">{acta.motivo ? `Motivo: ${acta.motivo}` : "Sin motivo registrado"}</span>
                        </>
                      ) : a.dictamen ? (
                        <>
                          <span className="block font-medium text-gray-900">¿Continuar proceso de admisión? {TEXTO_CONTINUAR[a.dictamen.resolucion]}</span>
                          {a.dictamen.comentarios && <span className="block break-words">{a.dictamen.comentarios}</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {acta ? <DescargarActa a={a} /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Aún no hay actas de entrevista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}
