"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Mail, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase, Regresar } from "@/components/posgrado/ui";
import { choques, describirGrupo, type ModalidadId } from "@/lib/evaluacion";
import { fechaLargaIso, useConfigEvaluacion } from "@/lib/evaluacion-config";
import { AvisoAspirante } from "@/components/posgrado/AvisoAspirante";
import { EditarCalendario } from "@/components/posgrado/EditarCalendario";
import {
  MINIMA_AREA,
  PROFESOR_AREA,
  areasReprobadas,
  evaluacionPendiente,
  nombreProfesor,
  estadoEvaluacion,
  fechaCorta,
  nombreArea,
  type AreaEvalId,
  type AspiranteP,
  type ResultadoArea,
  type ResultadoEval,
} from "@/lib/posgrado/datos";

/** Evaluación: elecciones, cambios a solicitud del aspirante y resultados (RF-15 a RF-18, RF-58, RN-08). */
export default function EvaluacionPosgrado() {
  const { aspirantes, cargado } = usePosgrado();
  const { materias: MATERIAS, modalidades: MODALIDADES, config } = useConfigEvaluacion();
  const [sel, setSel] = useState<string | null>(null);
  if (!cargado) return null;

  const lista = aspirantes.filter((a) => a.etapa === "evaluacion" && !a.concluido);
  const actual = lista.find((a) => a.id === sel);

  const estado = (a: AspiranteP) => {
    const e = a.evaluacion;
    const x = estadoEvaluacion(e);
    return <Etiqueta tono={x.tono}>{x.t}</Etiqueta>;
  };

  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Evaluación académica" subtitulo="Modalidades, grupos del propedéutico y resultados" />

      <EditarCalendario />

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Elección</th>
                <th className="px-3 py-2.5 font-medium">Resultado</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => (
                <tr key={a.id} className={sel === a.id ? "bg-indigo-50/50" : ""}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="font-mono text-xs text-gray-500">{a.id}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {a.evaluacion.modalidad === "propedeutico"
                      ? `Propedéutico · ${MATERIAS.map((m) => `${m.nombre.split(" ")[0]} ${a.evaluacion.grupos[m.id] ?? "—"}`).join(", ")}`
                      : a.evaluacion.modalidad === "examen"
                        ? "Solo examen"
                        : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-700">
                    {a.evaluacion.propedeutico && <p>Propedéutico: {a.evaluacion.propedeutico.calificacion}{areasReprobadas(a.evaluacion.propedeutico).length ? ` · no acreditó ${areasReprobadas(a.evaluacion.propedeutico).length} área(s)` : ""}</p>}
                    {a.evaluacion.examen && <p>Examen: {a.evaluacion.examen.calificacion}</p>}
                    {!a.evaluacion.propedeutico && !a.evaluacion.examen && "—"}
                  </td>
                  <td className="px-3 py-3">{estado(a)}</td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => setSel(sel === a.id ? null : a.id)} className="font-medium text-primary hover:underline">
                      {sel === a.id ? "Cerrar" : "Gestionar"}
                    </button>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No hay aspirantes en evaluación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {actual && (
        <div className="mt-6 space-y-6" key={actual.id}>
          <div className="grid gap-6 lg:grid-cols-2">
            <CambiarEleccion a={actual} />
            <Resultados a={actual} />
          </div>
          <AvisoAspirante
            aspirante={actual.id}
            nombre={actual.nombre}
            plantillas={[
              {
                id: "horario",
                t: "Cambio de horario o grupo del propedéutico",
                asunto: "Cambio en el horario de tus cursos propedéuticos",
                mensaje: `Estimado(a) ${actual.nombre.split(" ")[0]}:\n\nTe informamos un cambio en tus cursos propedéuticos (${MODALIDADES.propedeutico.fechas}). Tus grupos quedan así:\n${MATERIAS.map(
                  (m) => `• ${m.nombre}: grupo ${actual.evaluacion.grupos[m.id] ?? "—"} (${describirGrupo(m.grupos.find((g) => g.id === actual.evaluacion.grupos[m.id]) ?? m.grupos[0])})`,
                ).join("\n")}\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
              },
              {
                id: "examen",
                t: "Cambio de fecha u hora del examen",
                asunto: "Cambio en la fecha de tu examen de admisión",
                mensaje: `Estimado(a) ${actual.nombre.split(" ")[0]}:\n\nTu examen de admisión será el ${fechaLargaIso(config.examen.fecha)} a las ${config.examen.hora} h en ${config.examen.lugar}.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
              },
              { id: "libre", t: "Otro aviso", asunto: "", mensaje: "" },
            ]}
          />
        </div>
      )}
    </>
  );
}

function CambiarEleccion({ a }: { a: AspiranteP }) {
  const { cambiarEleccion } = usePosgrado();
  const { materias: MATERIAS, modalidades: MODALIDADES } = useConfigEvaluacion();
  const [modalidad, setModalidad] = useState<ModalidadId | undefined>(a.evaluacion.modalidad);
  const [grupos, setGrupos] = useState<Record<string, string>>(a.evaluacion.grupos);
  const [motivo, setMotivo] = useState("");
  const [hecho, setHecho] = useState(false);
  const conResultado = !!(a.evaluacion.propedeutico || a.evaluacion.examen);

  const elegidos = MATERIAS.flatMap((m) => {
    const g = m.grupos.find((x) => x.id === grupos[m.id]);
    return g ? [{ materia: m, grupo: g }] : [];
  });
  const cruces = modalidad === "propedeutico" ? choques(elegidos) : [];
  const completo = modalidad === "examen" || (modalidad === "propedeutico" && elegidos.length === MATERIAS.length);
  const sinCambio = modalidad === a.evaluacion.modalidad && JSON.stringify(grupos) === JSON.stringify(a.evaluacion.grupos);
  const listo = completo && !cruces.length && motivo.trim() && !sinCambio && !conResultado;

  return (
    <Tarjeta titulo={<span className="flex items-center gap-2"><RefreshCw size={16} className="text-primary" /> {a.evaluacion.modalidad ? "Cambiar elección" : "Asignar elección"}</span>}>
      <p className="flex items-start gap-1.5 text-sm text-gray-600">
        <Mail size={14} className="mt-0.5 shrink-0" /> El aspirante ya no puede cambiarla desde su sesión; lo solicita por correo y Posgrado lo registra aquí.
      </p>
      {conResultado ? (
        <p className="mt-3 text-sm text-gray-500">Ya tiene resultados registrados; la elección no se puede cambiar.</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {(Object.keys(MODALIDADES) as ModalidadId[]).map((m) => (
              <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${modalidad === m ? "border-primary bg-indigo-50" : "border-gray-300"}`}>
                <input type="radio" name="modalidad" checked={modalidad === m} onChange={() => setModalidad(m)} className="accent-[var(--color-primary)]" />
                {MODALIDADES[m].titulo}
              </label>
            ))}
          </div>
          {modalidad === "propedeutico" && (
            <div className="mt-3 grid gap-2">
              {MATERIAS.map((m) => (
                <label key={m.id} className="text-sm">
                  <span className="text-gray-700">{m.nombre}</span>
                  <select value={grupos[m.id] ?? ""} onChange={(e) => setGrupos({ ...grupos, [m.id]: e.target.value })} className={`${inputBase} mt-1`}>
                    <option value="">Elige grupo</option>
                    {m.grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        Grupo {g.id} — {describirGrupo(g)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {cruces.length > 0 && (
            <div className="mt-3">
              <Aviso tono="error" titulo="Choque de horario">
                {cruces.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </Aviso>
            </div>
          )}
          <label className="mt-3 block text-sm">
            <span className="font-medium text-gray-900">Motivo (queda en bitácora)</span>
            <input
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setHecho(false);
              }}
              placeholder="Ej. Solicitud por correo del 20 de abril"
              className={`${inputBase} mt-1`}
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-2">
            {hecho ? <span className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={15} /> Guardado y notificado</span> : <span />}
            <button
              type="button"
              className={botonPrimario}
              disabled={!listo}
              onClick={() => {
                cambiarEleccion(a.id, modalidad!, modalidad === "propedeutico" ? grupos : {}, motivo.trim());
                setMotivo("");
                setHecho(true);
              }}
            >
              Guardar y notificar
            </button>
          </div>
          {a.enVivo && <p className="mt-2 text-xs text-gray-500">Este aspirante es el de tu sesión de aspirante: el cambio también se verá ahí.</p>}
        </>
      )}
    </Tarjeta>
  );
}

type TipoResultado = "propedeutico" | "examen";

function Fila({ t, r }: { t: string; r: ResultadoEval }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <div className="flex flex-wrap justify-between gap-2">
        <dt className="text-gray-500">{t}</dt>
        <dd>
          {r.publicadoEl ? <Etiqueta tono="bg-emerald-50 text-emerald-700">Publicado {fechaCorta(r.publicadoEl)}</Etiqueta> : <Etiqueta tono="bg-violet-50 text-violet-800">Sin publicar</Etiqueta>}
        </dd>
      </div>
      <ul className="mt-1 space-y-0.5 text-sm">
        {r.areas ? (
          (Object.entries(r.areas) as [AreaEvalId, ResultadoArea][]).map(([k, x]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="text-gray-700">{nombreArea(k)}</span>
              <span className={x.acreditado ? "text-emerald-700" : "text-red-700"}>
                {x.calificacion} · {x.acreditado ? "acreditada" : "no acreditada"}
              </span>
            </li>
          ))
        ) : (
          <li className={r.acreditado ? "text-emerald-700" : "text-red-700"}>
            {r.calificacion} · {r.acreditado ? "acreditado" : "no acreditado"}
          </li>
        )}
      </ul>
    </div>
  );
}


function Resultados({ a }: { a: AspiranteP }) {
  const { actualizar, enviarAviso } = usePosgrado();
  const { modalidades: MODALIDADES, config } = useConfigEvaluacion();
  const e = a.evaluacion;
  const so = e.segundaOportunidad;
  const nom = a.nombre.split(" ")[0];
  const firma = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

  // Qué falta calificar (lo capturan los profesores de cada área)
  const pend = evaluacionPendiente(e);

  // Resultado registrado que falta publicar
  const porPublicar: TipoResultado | null = e.examen && !e.examen.publicadoEl ? "examen" : e.propedeutico && !e.propedeutico.publicadoEl ? "propedeutico" : null;

  const publicar = () => {
    if (!porPublicar) return;
    const r = e[porPublicar]!;
    const publicado: ResultadoEval = { ...r, publicadoEl: new Date().toISOString() };
    const ev = { ...e, [porPublicar]: publicado };
    const reprobadas = areasReprobadas(r);
    if (r.acreditado) {
      actualizar(a.id, { evaluacion: ev, etapa: "dictamen" }, `Publicó resultados del ${porPublicar === "propedeutico" ? "propedéutico" : "examen"}: acreditado; pasa a comisión`);
      enviarAviso([a.id], "ambos", "Resultados publicados: acreditaste tu evaluación", `Estimado(a) ${nom}:\n\nYa se publicaron tus resultados en SIGAP (5 · Resultados). Acreditaste tu evaluación; tu resultado pasa a la Comisión de Admisión del Colegio de Profesores.${firma}`);
    } else if (porPublicar === "propedeutico") {
      actualizar(a.id, { evaluacion: ev }, `Publicó resultados del propedéutico: no acreditó ${reprobadas.map(nombreArea).join(" y ")}; se le ofrece el examen de esas áreas (RN-08)`);
      enviarAviso(
        [a.id],
        "ambos",
        "Resultados del curso propedéutico",
        `Estimado(a) ${nom}:\n\nYa se publicaron tus resultados del curso propedéutico en SIGAP (5 · Resultados). No acreditaste: ${reprobadas.map(nombreArea).join(" y ")}.\n\nPuedes presentar el examen de admisión de ${reprobadas.length > 1 ? "esas áreas" : "esa área"} el ${MODALIDADES.examen.fechas}. Entra a SIGAP para indicarnos si quieres presentarlo.${firma}`,
      );
    } else {
      actualizar(a.id, { evaluacion: ev, concluido: "No acreditó la evaluación (RN-08)" }, "Publicó resultados del examen: no acreditado; el proceso concluye");
      // RN-08: mensaje invitándolo a nuevas convocatorias (RF-17: no se le muestra "Rechazado")
      enviarAviso([a.id], "ambos", "Resultado de tu proceso de admisión", `Estimado(a) ${nom}:\n\nAgradecemos tu participación en el proceso de admisión. Te invitamos a participar en la próxima convocatoria de la Maestría en Tecnología de Cómputo.${firma}`);
    }
  };

  const decidirPorAspirante = (decision: "examen" | "no") => {
    const reprobadas = areasReprobadas(e.propedeutico);
    actualizar(
      a.id,
      { evaluacion: { ...e, segundaOportunidad: { decision, areas: reprobadas, el: new Date().toISOString() } }, ...(decision === "no" ? { concluido: "Decidió no presentar el examen de las áreas no acreditadas (RN-08)" } : {}) },
      decision === "examen" ? `Registró que el aspirante presentará el examen de ${reprobadas.map(nombreArea).join(" y ")}` : "Registró que el aspirante no presentará el examen; el proceso concluye",
    );
  };

  return (
    <Tarjeta titulo="Resultados">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
          <dt className="text-gray-500">Modalidad</dt>
          <dd className="text-right text-gray-900">{e.modalidad ? MODALIDADES[e.modalidad].titulo : "Sin elegir"}</dd>
        </div>
        {e.propedeutico && <Fila t="Curso propedéutico" r={e.propedeutico} />}
        {so && (
          <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Decisión del aspirante</dt>
            <dd className={so.decision === "examen" ? "text-gray-900" : "text-red-700"}>
              {so.decision === "examen" ? `Presentará examen de ${so.areas.map(nombreArea).join(" y ")}` : "No presentará el examen"}
            </dd>
          </div>
        )}
        {e.examen && <Fila t={e.modalidad === "propedeutico" ? "Examen de áreas no acreditadas" : "Examen de admisión"} r={e.examen} />}
      </dl>

      {porPublicar ? (
        <div className="mt-4">
          <Aviso tono="info" titulo={`Resultados del ${porPublicar === "propedeutico" ? "curso propedéutico" : "examen"} registrados`}>
            El aspirante aún no los ve. Al publicarlos se le notifica por correo y en SIGAP (5 · Resultados)
            {porPublicar === "propedeutico" && !e.propedeutico!.acreditado ? " y se le pregunta si quiere presentar el examen de las áreas no acreditadas." : "."}
          </Aviso>
          <div className="mt-3 flex justify-end">
            <button type="button" className={botonPrimario} onClick={publicar}>
              <Send size={15} /> Publicar resultados
            </button>
          </div>
        </div>
      ) : e.propedeutico?.publicadoEl && !e.propedeutico.acreditado && !so ? (
        <div className="mt-4">
          <Aviso tono="alerta" titulo="Esperando la decisión del aspirante">
            <span className="flex items-start gap-1.5">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Se le preguntó en SIGAP si quiere presentar el examen de {areasReprobadas(e.propedeutico).map(nombreArea).join(" y ")} (
              {MODALIDADES.examen.fechas}).
            </span>
          </Aviso>
          {!a.enVivo && (
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <span className="w-full text-right text-xs text-gray-500">Si respondió por correo, regístralo aquí:</span>
              <button type="button" className={botonSecundario} onClick={() => decidirPorAspirante("no")}>
                No presentará
              </button>
              <button type="button" className={botonPrimario} onClick={() => decidirPorAspirante("examen")}>
                Presentará el examen
              </button>
            </div>
          )}
        </div>
      ) : pend ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900">
            Calificaciones del {pend.tipo === "propedeutico" ? "curso propedéutico" : pend.esSegunda ? "examen de áreas no acreditadas" : "examen de admisión"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Las captura el profesor de cada área en su sesión de Profesor. Al completarse, aquí podrás publicarlas.
            {pend.tipo === "examen" && ` Examen: ${fechaLargaIso(config.examen.fecha)}, ${config.examen.hora} h, ${config.examen.lugar}.`}
          </p>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {pend.areas.map((id) => {
              const c = e.capturas?.[pend.tipo]?.[id];
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="text-gray-800">{nombreArea(id)}</span>
                    <span className="block text-xs text-gray-500">{nombreProfesor(PROFESOR_AREA[id])}</span>
                  </span>
                  {c ? (
                    <Etiqueta tono={c.calificacion >= MINIMA_AREA ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                      {c.calificacion} · capturada {fechaCorta(c.el)}
                    </Etiqueta>
                  ) : (
                    <Etiqueta tono="bg-gray-100 text-gray-600">Pendiente de captura</Etiqueta>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">{e.modalidad ? "No hay resultados pendientes." : "Asigna primero una modalidad."}</p>
      )}
      <Link href={`/posgrado/aspirantes/${a.id}`} className={`${botonSecundario} mt-4 w-full`}>
        Ver expediente
      </Link>
    </Tarjeta>
  );
}
