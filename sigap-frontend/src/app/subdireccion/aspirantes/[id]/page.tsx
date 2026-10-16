"use client";

import { use } from "react";
import { CheckCircle2, Circle, CircleDot, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, EtiquetaBandeja, EtiquetaDoc, Migas, Progreso, Tarjeta } from "@/components/posgrado/ui";
import { SoloConsulta } from "@/components/subdireccion/SoloConsulta";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { TONO_DICTAMEN, dictamenFinal, procedenciaSeparada } from "@/lib/reporte-aspirantes";
import {
  TONO_INSCRIPCION,
  bandejaDe,
  estadoEvaluacion,
  estadoInscripcion,
  pendientesInscripcion,
  puedeInscribirse,
  fechaCorta,
  fechaHora,
  nombreArea,
  nombreProfesor,
  progresoDe,
  type AreaEvalId,
  type ResultadoArea,
  type ResultadoEval,
} from "@/lib/posgrado/datos";
import { faseSubdireccion, nombreFase } from "@/lib/subdireccion";

type Estado = "hecho" | "actual" | "pendiente" | "detenido";
const ORDEN = ["registro", "documentos", "entrevista", "evaluacion", "comision", "admitido", "inscrito"] as const;

/** Proceso completo de un aspirante, en modo consulta (Subdirección Académica). */
export default function ProcesoAspirante({ params }: PageProps<"/subdireccion/aspirantes/[id]">) {
  const { id } = use(params);
  const { porId, bitacora, cargado } = usePosgrado();
  const { modalidades } = useConfigEvaluacion();
  if (!cargado) return null;
  const a = porId(id);
  if (!a)
    return (
      <>
        <Migas items={[{ t: "Aspirantes", href: "/subdireccion/aspirantes" }, { t: id }]} />
        <Aviso tono="error" titulo="No encontramos a este aspirante" />
      </>
    );

  const fase = faseSubdireccion(a);
  const p = progresoDe(a);
  // Hasta dónde llegó (si concluyó sin admisión, la fase en que se detuvo)
  const alcanzada = a.concluido ? ORDEN.indexOf(a.etapa === "dictamen" ? "comision" : a.etapa) : ORDEN.indexOf(fase as (typeof ORDEN)[number]);
  const estadoDe = (paso: (typeof ORDEN)[number]): Estado => {
    const i = ORDEN.indexOf(paso);
    if (i < alcanzada || fase === "inscrito") return "hecho";
    if (i === alcanzada) return a.concluido ? "detenido" : "actual";
    return "pendiente";
  };
  const historial = bitacora.filter((b) => b.aspirante === a.id);
  const aprobados = a.documentos.filter((d) => d.estado === "aprobado").length;

  return (
    <>
      <Migas items={[{ t: "Aspirantes", href: "/subdireccion/aspirantes" }, { t: a.id }]} />
      <PageHeader titulo={a.nombre} subtitulo={`${a.id} · ${nombreFase(fase)}`} />
      <SoloConsulta />

      {a.concluido && (
        <div className="mb-5">
          <Aviso tono="error" titulo="Proceso concluido sin admisión">
            {a.concluido}
          </Aviso>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tarjeta titulo="Datos principales">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ["CURP", a.curp],
              ["Correo", a.correo],
              ["Teléfono", a.telefono],
              ["Institución de procedencia", procedenciaSeparada(a.procedencia).institucion],
              ["Unidad académica / escuela", procedenciaSeparada(a.procedencia).unidad || "—"],
              ["Promedio de licenciatura", a.promedio],
              ["Fecha de registro", fechaCorta(a.registradoEl)],
              ["Dedicación elegida", a.dedicacion ?? "Aún no la elige"],
              ["Último movimiento", fechaHora(a.ultimoMovimiento)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-gray-500">{k}</dt>
                <dd className="break-words font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
        <Tarjeta titulo="Avance">
          <Progreso pct={a.concluido ? 100 : p.pct} texto={a.concluido ? "Concluido" : p.texto} />
          <div className="mt-4">
            <EtiquetaBandeja b={bandejaDe(a)} />
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Dictamen:{" "}
            {dictamenFinal(a) ? <Etiqueta tono={TONO_DICTAMEN[dictamenFinal(a)!]}>{dictamenFinal(a)}</Etiqueta> : <span className="text-gray-500">aún no hay</span>}
          </p>
          <p className="mt-3 text-sm text-gray-600">Documentos aprobados: {aprobados} de {a.documentos.length}</p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Proceso de admisión" className="mt-6">
        <ol className="space-y-5">
          <Paso estado={estadoDe("registro")} titulo="1 · Registro">
            Se registró el {fechaCorta(a.registradoEl)}.
          </Paso>

          <Paso estado={estadoDe("documentos")} titulo="2 · Documentos">
            {aprobados} de {a.documentos.length} documentos aprobados por Posgrado.
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {a.documentos.map((d) => (
                <li key={d.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-1.5">
                  <span className="min-w-0 truncate text-gray-800">{d.nombre}</span>
                  <EtiquetaDoc e={d.estado} hasta={d.prorrogaHasta} />
                </li>
              ))}
            </ul>
          </Paso>

          <Paso estado={estadoDe("entrevista")} titulo="3 · Entrevista colegiada">
            {a.entrevista ? (
              <>
                {fechaCorta(a.entrevista.fecha)}, {a.entrevista.hora} h · {a.entrevista.modalidad} · {a.entrevista.sala}
                <span className="block text-gray-500">Profesores entrevistadores: {a.entrevista.sinodo.map(nombreProfesor).join(" · ")}</span>
                {a.actaEntrevista && (
                  <span className="block text-gray-500">
                    Acta MTC-EC: {a.actaEntrevista.firmada ? "firmada por los 3 y subida" : "llenada; falta subirla firmada (con eso se aplica el dictamen)"}
                  </span>
                )}
                {a.dictamen && (
                  <span className="mt-1 block">
                    Resultado: <b>{a.dictamen.resolucion}</b> {a.dictamen.comentarios && <span className="text-gray-500">— “{a.dictamen.comentarios}”</span>}
                  </span>
                )}
              </>
            ) : (
              "Sin cita todavía."
            )}
          </Paso>

          <Paso estado={estadoDe("evaluacion")} titulo="4–5 · Evaluación y resultados">
            {a.evaluacion.modalidad ? (
              <>
                {modalidades[a.evaluacion.modalidad].titulo} · <Etiqueta tono={estadoEvaluacion(a.evaluacion).tono}>{estadoEvaluacion(a.evaluacion).t}</Etiqueta>
                {a.evaluacion.propedeutico && <Resultado t="Curso propedéutico" r={a.evaluacion.propedeutico} />}
                {a.evaluacion.segundaOportunidad && (
                  <span className="mt-1 block">
                    Decisión del aspirante:{" "}
                    {a.evaluacion.segundaOportunidad.decision === "examen"
                      ? `presentar examen de ${a.evaluacion.segundaOportunidad.areas.map(nombreArea).join(" y ")}`
                      : "no presentar el examen"}
                  </span>
                )}
                {a.evaluacion.examen && <Resultado t="Examen de admisión" r={a.evaluacion.examen} />}
              </>
            ) : (
              "Aún no elige modalidad (propedéutico o examen)."
            )}
          </Paso>

          <Paso estado={estadoDe("comision")} titulo="Comisión de Admisión, Colegio de Profesores y 6 · resultado">
            {a.resolucion ? (
              <>
                Resolución del Colegio: <b>{a.resolucion}</b> (dictamen {dictamenFinal(a)?.toLowerCase()})
                <span className="block">
                  Resultado publicado al aspirante en SIGAP (6 · Dictamen final)
                  {a.turnadoUteycv ? ` el ${fechaCorta(a.turnadoUteycv)}` : ""}.
                  {a.resolucion !== "No aceptado" && " Con esto concluye su proceso de admisión."}
                </span>
              </>
            ) : (
              "Sin resolución todavía."
            )}
          </Paso>
          <Paso estado={estadoDe("admitido")} titulo="Inscripción (UTEyCV)">
            {puedeInscribirse(a) ? (
              <>
                <Etiqueta tono={TONO_INSCRIPCION[estadoInscripcion(a)]}>{estadoInscripcion(a)}</Etiqueta>
                {a.uteycv?.formalizadoEl ? (
                  <span className="mt-1 block">
                    Número de registro <b className="font-mono">{a.uteycv.sicep}</b> · inscrito el {fechaCorta(a.uteycv.formalizadoEl)} ({a.dedicacion?.toLowerCase()}).
                  </span>
                ) : (
                  <span className="mt-1 block">
                    Falta: {pendientesInscripcion(a).filter((x) => !x.ok).map((x) => x.t).join(", ") || "nada; listo para formalizar"}.
                  </span>
                )}
              </>
            ) : (
              "Se habilita al publicarse su resultado de admisión (Aceptado o Con reservas)."
            )}
          </Paso>
        </ol>
      </Tarjeta>

      <Tarjeta titulo="Historial de movimientos" className="mt-6">
        {historial.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {historial.map((b, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-gray-800">{b.accion}</span>
                <span className="text-xs text-gray-500">
                  {fechaHora(b.fecha)} · {b.usuario}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Sin movimientos registrados en esta sesión de demostración.</p>
        )}
      </Tarjeta>
    </>
  );
}

function Paso({ estado, titulo, children }: { estado: Estado; titulo: string; children: React.ReactNode }) {
  const icono = {
    hecho: <CheckCircle2 size={20} className="text-emerald-600" />,
    actual: <CircleDot size={20} className="text-primary" />,
    pendiente: <Circle size={20} className="text-gray-300" />,
    detenido: <XCircle size={20} className="text-red-500" />,
  }[estado];
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icono}</span>
      <div className={`min-w-0 flex-1 text-sm ${estado === "pendiente" ? "text-gray-400" : "text-gray-700"}`}>
        <p className={`font-semibold ${estado === "pendiente" ? "text-gray-400" : "text-gray-900"}`}>
          {titulo}
          {estado === "actual" && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-primary">Fase actual</span>}
        </p>
        <div className="mt-0.5 break-words">{children}</div>
      </div>
    </li>
  );
}

function Resultado({ t, r }: { t: string; r: ResultadoEval }) {
  return (
    <span className="mt-1.5 block rounded-lg bg-gray-50 px-3 py-2">
      <span className="font-medium text-gray-900">{t}</span>{" "}
      <span className="text-xs text-gray-500">{r.publicadoEl ? `· publicado ${fechaCorta(r.publicadoEl)}` : "· sin publicar"}</span>
      {r.areas ? (
        (Object.entries(r.areas) as [AreaEvalId, ResultadoArea][]).map(([k, x]) => (
          <span key={k} className="flex flex-wrap justify-between gap-x-3">
            <span>{nombreArea(k)}</span>
            <span className={x.acreditado ? "text-emerald-700" : "text-red-700"}>
              {x.calificacion} · {x.acreditado ? "acreditada" : "no acreditada"}
            </span>
          </span>
        ))
      ) : (
        <span className={`block ${r.acreditado ? "text-emerald-700" : "text-red-700"}`}>
          {r.calificacion} · {r.acreditado ? "acreditado" : "no acreditado"}
        </span>
      )}
    </span>
  );
}

