"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Mail, RefreshCw, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { choques, describirGrupo, type ModalidadId } from "@/lib/evaluacion";
import { fechaLargaIso, useConfigEvaluacion } from "@/lib/evaluacion-config";
import { AvisoAspirante } from "@/components/posgrado/AvisoAspirante";
import { EditarCalendario } from "@/components/posgrado/EditarCalendario";
import { fechaCorta, type AspiranteP, type ResultadoEval } from "@/lib/posgrado/datos";

/** Calificación mínima aprobatoria de ejemplo (se configura por convocatoria). */
const MINIMA = 8;

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
    if (!e.modalidad) return <Etiqueta tono="bg-gray-100 text-gray-600">Sin elegir</Etiqueta>;
    if (e.propedeutico && !e.propedeutico.acreditado && !e.examen) return <Etiqueta tono="bg-amber-50 text-amber-800">Segunda oportunidad</Etiqueta>;
    return <Etiqueta tono="bg-sky-50 text-sky-800">En curso</Etiqueta>;
  };

  return (
    <>
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
                    {a.evaluacion.propedeutico && <p>Propedéutico: {a.evaluacion.propedeutico.calificacion}</p>}
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

function Resultados({ a }: { a: AspiranteP }) {
  const { actualizar, enviarAviso } = usePosgrado();
  const { modalidades: MODALIDADES } = useConfigEvaluacion();
  const [cal, setCal] = useState("");
  const e = a.evaluacion;
  const valor = Number(cal);
  const valido = cal !== "" && valor >= 0 && valor <= 10;

  // Qué toca registrar
  const tipo: "propedeutico" | "examen" | null = !e.modalidad
    ? null
    : e.modalidad === "propedeutico" && !e.propedeutico
      ? "propedeutico"
      : (e.modalidad === "examen" && !e.examen) || (e.propedeutico && !e.propedeutico.acreditado && !e.examen)
        ? "examen"
        : null;
  const esSegunda = tipo === "examen" && !!e.propedeutico;

  const registrar = () => {
    if (!tipo || !valido) return;
    const r: ResultadoEval = { calificacion: valor, acreditado: valor >= MINIMA, registradoEl: new Date().toISOString() };
    const nom = a.nombre.split(" ")[0];
    const nombre = tipo === "propedeutico" ? "curso propedéutico" : esSegunda ? "examen directo (segunda oportunidad)" : "examen de admisión";
    if (r.acreditado) {
      actualizar(a.id, { evaluacion: { ...e, [tipo]: r }, etapa: "dictamen" }, `Registró ${nombre}: ${valor} (acreditado); pasa a comisión`);
      enviarAviso([a.id], "ambos", "Acreditaste tu evaluación", `Estimado(a) ${nom}:\n\nAcreditaste tu evaluación de admisión. Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`);
    } else if (tipo === "propedeutico") {
      actualizar(a.id, { evaluacion: { ...e, propedeutico: r } }, `Registró curso propedéutico: ${valor} (no acreditado); se habilita el examen directo (RN-08)`);
      enviarAviso([a.id], "ambos", "Tienes derecho a presentar el examen de admisión", `Estimado(a) ${nom}:\n\nNo acreditaste el curso propedéutico, pero tienes derecho a presentar el examen de admisión el ${MODALIDADES.examen.fechas} (RN-08).\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`);
    } else {
      actualizar(
        a.id,
        { evaluacion: { ...e, examen: r }, concluido: "No acreditó la evaluación (RN-08)" },
        `Registró ${nombre}: ${valor} (no acreditado); el proceso concluye`,
      );
      // RN-08: mensaje invitándolo a nuevas convocatorias (RF-17: no se le muestra "Rechazado")
      enviarAviso([a.id], "ambos", "Resultado de tu proceso de admisión", `Estimado(a) ${nom}:\n\nAgradecemos tu participación en el proceso de admisión. Te invitamos a participar en la próxima convocatoria de la Maestría en Tecnología de Cómputo.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`);
    }
    setCal("");
  };

  return (
    <Tarjeta titulo="Resultados">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
          <dt className="text-gray-500">Modalidad</dt>
          <dd className="text-gray-900">{e.modalidad ? MODALIDADES[e.modalidad].titulo : "Sin elegir"}</dd>
        </div>
        {e.propedeutico && (
          <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Curso propedéutico</dt>
            <dd className={e.propedeutico.acreditado ? "text-emerald-700" : "text-red-700"}>
              {e.propedeutico.calificacion} · {e.propedeutico.acreditado ? "acreditado" : "no acreditado"} · {fechaCorta(e.propedeutico.registradoEl)}
            </dd>
          </div>
        )}
        {e.examen && (
          <div className="flex justify-between gap-3 border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Examen</dt>
            <dd className={e.examen.acreditado ? "text-emerald-700" : "text-red-700"}>
              {e.examen.calificacion} · {e.examen.acreditado ? "acreditado" : "no acreditado"}
            </dd>
          </div>
        )}
      </dl>

      {esSegunda && (
        <div className="mt-4">
          <Aviso tono="alerta" titulo="Segunda oportunidad habilitada">
            <span className="flex items-start gap-1.5">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Reprobar el propedéutico habilita el examen directo ({MODALIDADES.examen.fechas}). Reprobar ese
              examen finaliza el proceso (RN-08).
            </span>
          </Aviso>
        </div>
      )}

      {tipo ? (
        <div className="mt-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-900">
              Calificación del {tipo === "propedeutico" ? "curso propedéutico" : esSegunda ? "examen directo" : "examen de admisión"} (0–10)
            </span>
            <input type="number" step="0.1" min={0} max={10} value={cal} onChange={(ev) => setCal(ev.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Mínima aprobatoria: {MINIMA.toFixed(1)} (ejemplo; se configura por convocatoria).{" "}
            {valido && (valor >= MINIMA ? <b className="text-emerald-700">Acreditado</b> : <b className="text-red-700">No acreditado</b>)}
          </p>
          <div className="mt-3 flex justify-end">
            <button type="button" className={botonPrimario} disabled={!valido} onClick={registrar}>
              {esSegunda ? "Registrar examen directo" : "Registrar resultado"}
            </button>
          </div>
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
