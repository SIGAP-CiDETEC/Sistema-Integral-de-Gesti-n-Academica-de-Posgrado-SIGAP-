"use client";

import { use, useState } from "react";
import { CalendarCheck, CheckCircle2, PenLine, Pencil, TriangleAlert, Upload, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Migas, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { ActaVista, DescargarActa, SinodoActa, TEXTO_CONTINUAR, TONO_RESOLUCION } from "@/components/profesor/ActaVista";
import { useAccionesProfesor } from "@/components/profesor/useAccionesProfesor";
import { DocumentosAspirante } from "@/components/profesor/DocumentosAspirante";
import { MODO_API } from "@/lib/api";
import { hoja1Prellenada } from "@/lib/registro-aspirante";
import { AREAS_INVESTIGACION } from "@/lib/registro-form";
import {
  CRITERIOS_ACTA,
  VALORACION_TEXTO,
  fechaCorta,
  lugaresLibres,
  nombreProfesor,
  type ActaEntrevista,
  type AspiranteP,
  type Resolucion,
  type Valoracion,
  horarioEntrevista,
} from "@/lib/posgrado/datos";
import { TONO_ENTREVISTA_PROF, citaPublicada, estadoEntrevistaProf, useProfesorActual } from "@/lib/profesor";

/**
 * Entrevista colegiada desde la sesión del profesor. El acta MTC-EC funciona como cola: el primer profesor entrevistador que la llena
 * la bloquea para los demás; todos la descargan, la imprimen y la firman; el primero que sube el PDF firmado aplica el
 * dictamen y bloquea la subida a los demás.
 */
export default function EntrevistaProfesor({ params }: PageProps<"/profesor/entrevistas/[id]">) {
  const { id } = use(params);
  const { porId, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  const { guardarActa, subirActaFirmada } = useAccionesProfesor();
  const [llenando, setLlenando] = useState(false);
  const [error, setError] = useState("");
  if (!cargado) return null;
  const a = porId(id);
  const yo = profesor?.id ?? "";
  const migas = <Migas items={[{ t: "Mis entrevistas", href: "/profesor/entrevistas" }, { t: id }]} />;
  if (!a?.entrevista)
    return (
      <>
        {migas}
        <Aviso tono="error" titulo="Esta entrevista no existe o aún no se programa" />
      </>
    );
  if (!a.entrevista.sinodo.includes(yo))
    return (
      <>
        {migas}
        <Aviso tono="alerta" titulo="No eres uno de los profesores entrevistadores de esta entrevista">
          {lugaresLibres(a.entrevista) > 0 ? "Si quieres participar, elígela en Mis entrevistas: todavía tiene lugares libres." : "Ya están asignados los 3 profesores entrevistadores."} En la vista de
          prueba puedes actuar como alguno de sus integrantes.
        </Aviso>
      </>
    );

  // Antes de que Posgrado publique la cita, el profesor no ve los datos del aspirante
  if (!citaPublicada(a) && !a.concluido)
    return (
      <>
        {migas}
        <PageHeader titulo="Entrevista colegiada" subtitulo={`${fechaCorta(a.entrevista.fecha)} · ${horarioEntrevista(a.entrevista)}`} />
        <Aviso tono="info" titulo="Aún no se publica la cita">
          Verás los datos del aspirante y podrás llenar el acta MTC-EC cuando el Departamento de Posgrado publique la cita (profesores entrevistadores:{" "}
          {a.entrevista.sinodo.length} de 3). Mientras tanto puedes dejar tu lugar desde Mis entrevistas.
        </Aviso>
      </>
    );

  const estado = estadoEntrevistaProf(a);
  const acta = a.actaEntrevista;
  const yoLaLlene = acta?.capturadaPor === yo;

  const subir = async (archivo: File | undefined | { name: string; type: string; size: number }) => {
    setError("");
    if (!archivo) return;
    if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) return setError("Sube el acta firmada en PDF.");
    if (archivo.size > 10 * 1024 * 1024) return setError("El PDF no debe pasar de 10 MB.");
    // Con el servidor, el motivo del rechazo lo muestra el aviso flotante
    if (!(await subirActaFirmada(a, archivo, yo)) && !MODO_API) setError("Otro profesor entrevistador ya subió el acta firmada.");
  };

  return (
    <>
      {migas}
      <PageHeader titulo="Entrevista colegiada" subtitulo={`${a.nombre} · ${a.id}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarCheck size={17} className="text-primary" /> Cita y aspirante</span>}>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ["Fecha y horario", `${fechaCorta(a.entrevista.fecha)} · ${horarioEntrevista(a.entrevista)}`],
              ["Modalidad / sala", `${a.entrevista.modalidad} · ${a.entrevista.sala}`],
              ["Procedencia", a.procedencia],
              ["Promedio de licenciatura", a.promedio],
              ["Correo", a.correo],
              ["Documentos aprobados", `${a.documentos.filter((d) => d.estado === "aprobado").length} de ${a.documentos.length}`],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-gray-500">{k}</dt>
                <dd className="break-words font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
        <Tarjeta titulo="Profesores entrevistadores">
          <Etiqueta tono={TONO_ENTREVISTA_PROF[estado]}>{estado}</Etiqueta>
          <div className="mt-3">
            <SinodoActa a={a} />
          </div>
        </Tarjeta>
      </div>

      <div className="mt-6">
        <DocumentosAspirante a={a} />
      </div>

      <div className="mt-6 space-y-6">
        {estado === "Profesores entrevistadores incompletos" ? (
          <Aviso tono="info" titulo={`Falta asignar profesores entrevistadores (${a.entrevista.sinodo.length} de 3)`}>
            Podrás llenar el acta MTC-EC cuando otros {lugaresLibres(a.entrevista)} profesor(es) elijan esta entrevista.
          </Aviso>
        ) : estado === "Esperando publicación" ? (
          <Aviso tono="info" titulo="Profesores entrevistadores completos: falta que Posgrado publique la entrevista al aspirante">
            Podrás llenar el acta MTC-EC cuando el Departamento de Posgrado publique la cita al aspirante. Mientras tanto revisa su registro de admisión.
          </Aviso>
        ) : a.concluido && !a.dictamen ? (
          <Aviso tono="error" titulo="El proceso de este aspirante ya concluyó">
            {a.concluido}
          </Aviso>
        ) : llenando && (!acta || yoLaLlene) && !acta?.firmada ? (
          <FormularioActa
            a={a}
            inicial={acta}
            onGuardar={async (nueva) => {
              const ok = await guardarActa(a, nueva, yo);
              if (!ok && !MODO_API) setError("Otro profesor entrevistador ya llenó el acta.");
              // Con el servidor, si no se guardó (p. ej. falta el motivo) el formulario sigue abierto
              if (ok || !MODO_API) setLlenando(false);
            }}
            onCancelar={() => setLlenando(false)}
            yo={yo}
          />
        ) : !acta ? (
          <Tarjeta titulo="Acta de entrevista colegiada (MTC-EC)">
            <p className="text-sm text-gray-600">
              La llena <b>un solo profesor</b> de los profesores entrevistadores, durante o al terminar la entrevista. En cuanto alguien la llena, a los demás les aparece para
              descargarla, imprimirla y firmarla.
            </p>
            <button type="button" className={`${botonPrimario} mt-4`} onClick={() => setLlenando(true)}>
              <PenLine size={15} /> Llenar acta MTC-EC
            </button>
          </Tarjeta>
        ) : (
          <>
            {a.dictamen && (
              <Aviso tono={a.dictamen.resolucion === "Rechazado" ? "error" : "exito"} titulo={`Dictamen aplicado: ${a.dictamen.resolucion}`}>
                {acta.firmada
                  ? `${nombreProfesor(acta.firmada.subidaPor)} subió el acta firmada por los 3 el ${fechaCorta(acta.firmada.el)}. `
                  : `Registrado el ${fechaCorta(a.dictamen.registradoEl)}. `}
                {a.dictamen.resolucion === "Rechazado" ? "El proceso del aspirante concluyó." : "El aspirante pasó a la fase de evaluación."}
              </Aviso>
            )}
            {!a.dictamen && (
              <Tarjeta titulo="Acta firmada por los 3 profesores entrevistadores">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                  <li>
                    {yoLaLlene ? "Tú llenaste el acta." : `La llenó ${nombreProfesor(acta.capturadaPor)}; ya no se puede llenar de nuevo.`} Descárgala e imprímela.
                  </li>
                  <li>Fírmenla los 3 profesores entrevistadores.</li>
                  <li>Súbela escaneada en PDF: el primero que la suba aplica el dictamen y se bloquea la subida para los demás.</li>
                </ol>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <DescargarActa a={a} />
                  {yoLaLlene && (
                    <button type="button" className={botonSecundario} onClick={() => setLlenando(true)}>
                      <Pencil size={14} /> Corregir acta
                    </button>
                  )}
                  <label className={`${botonPrimario} cursor-pointer`}>
                    <Upload size={15} /> Subir acta firmada (PDF)
                    <input type="file" accept="application/pdf" aria-label="Subir acta firmada" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
                  </label>
                </div>
                {error && (
                  <div className="mt-3">
                    <Aviso tono="error" titulo={error} />
                  </div>
                )}
                {!MODO_API && <div className="mt-4 border-t border-dashed border-gray-300 pt-3">
                  <button
                    type="button"
                    onClick={() => subir({ name: `MTC-EC_${a.id}_firmada.pdf`, type: "application/pdf", size: 1000 })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Wand2 size={12} /> Solo cascarón: subir un acta firmada de ejemplo
                  </button>
                </div>}
              </Tarjeta>
            )}
            <ActaVista a={a} sinDescarga={!a.dictamen} />
          </>
        )}
        {error && !acta && <Aviso tono="error" titulo={error} />}
      </div>
    </>
  );
}

// ---------------- Formulario del acta ----------------

type Hoja1 = ActaEntrevista["hoja1"];
const SI_NO = ["Sí", "No"] as const;

function Opciones<T extends string>({ nombre, opciones, valor, onChange, texto }: { nombre: string; opciones: readonly T[]; valor?: T; onChange: (v: T) => void; texto?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <label key={o} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${valor === o ? "border-primary bg-indigo-50 text-primary" : "border-gray-300 bg-white text-gray-700"}`}>
          <input type="radio" name={nombre} checked={valor === o} onChange={() => onChange(o)} className="sr-only" />
          {texto ? texto(o) : o}
        </label>
      ))}
    </div>
  );
}

function Pregunta({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <p className="mb-1.5 font-medium text-gray-900">{t}</p>
      {children}
    </div>
  );
}

function FormularioActa({ a, inicial, onGuardar, onCancelar, yo }: { a: AspiranteP; inicial?: ActaEntrevista; onGuardar: (x: ActaEntrevista) => void; onCancelar?: () => void; yo: string }) {
  const { registroDe, capturasDe } = usePosgrado();
  // Si aún no hay acta, la hoja 1 llega prellenada con el registro y el expediente del aspirante
  const [h, setH] = useState<Hoja1>(() => inicial?.hoja1 ?? hoja1Prellenada(a, registroDe(a.id), capturasDe(a.id)));
  const [criterios, setCriterios] = useState<ActaEntrevista["criterios"]>(inicial?.criterios ?? {});
  const [proyeccion, setProyeccion] = useState(inicial?.proyeccion ?? "");
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? "");
  const [resolucion, setResolucion] = useState<Resolucion | undefined>(inicial?.resolucion);
  const [motivo, setMotivo] = useState(inicial?.motivo ?? "");
  const set = (p: Partial<Hoja1>) => setH((x) => ({ ...x, ...p }));

  const faltan = [
    !h.areas.length && "áreas de interés",
    !h.becaSecihti && "beca SECIHTI",
    !h.sinBeca && "continuar sin beca",
    !h.profesorInteres && "profesor de interés",
    h.profesorInteres === "Sí" && !h.profesorNombre?.trim() && "nombre del profesor",
    !h.horario && "horario",
    !h.ingles2 && "inglés",
    !h.certificado && "certificado",
    CRITERIOS_ACTA.some((c) => !criterios[c.id]) && "consideraciones (hoja 2)",
    !observaciones.trim() && "observaciones generales",
    !resolucion && "¿continuar proceso?",
    resolucion && resolucion !== "Aprobado" && !motivo.trim() && "motivo",
  ].filter(Boolean) as string[];

  const ejemplo = () => {
    setH({
      areas: ["Computación Inteligente", "Procesamiento Paralelo", "Redes de Computadoras"],
      becaSecihti: "Sí",
      sinBeca: "Sí",
      profesorInteres: "Sí",
      profesorNombre: nombreProfesor(yo),
      horario: "Matutino",
      ingles2: "Sí",
      inglesSituacion: "Constancia CENLEX vigente",
      certificado: "Sí",
      argumentacion: "Cuenta con experiencia en desarrollo de software y un anteproyecto claro sobre visión por computadora.",
    });
    setCriterios({ formacion: "MB", programa: "B", experiencia: "B", laborales: "B", personales: "MB", familiar: "B" });
    setProyeccion("Concluir la maestría en tiempo y continuar a doctorado.");
    setObservaciones("Perfil adecuado para la línea de Computación inteligente.");
    setResolucion("Aprobado");
    setMotivo("");
  };

  const guardar = () => {
    if (faltan.length || !resolucion) return;
    onGuardar({
      hoja1: { ...h, profesorNombre: h.profesorInteres === "Sí" ? h.profesorNombre : "" },
      criterios,
      proyeccion: proyeccion.trim(),
      observaciones: observaciones.trim(),
      resolucion,
      motivo: resolucion === "Aprobado" ? "" : motivo.trim(),
      capturadaPor: yo,
      capturadaEl: new Date().toISOString(),
    });
  };

  const area = (i: number) => (
    <select
      aria-label={`Área de interés ${i + 1}`}
      value={h.areas[i] ?? ""}
      onChange={(e) => {
        const nuevas = [...h.areas];
        nuevas[i] = e.target.value;
        set({ areas: nuevas.filter((x, j) => x && nuevas.indexOf(x) === j) });
      }}
      className={inputBase}
    >
      <option value="">{i + 1}.ª opción</option>
      {AREAS_INVESTIGACION.filter((x) => x === h.areas[i] || !h.areas.includes(x)).map((x) => (
        <option key={x}>{x}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {inicial ? "" : "La hoja 1 viene prellenada con el registro y el expediente del aspirante; confírmala o corrígela. "}Llena el acta durante o al terminar la
          entrevista. Al guardarla, los otros dos profesores entrevistadores ya no podrán llenarla y les aparecerá para descargarla, imprimirla y firmarla.
        </p>
        {!MODO_API && (
          <button type="button" onClick={ejemplo} className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">
            <Wand2 size={12} /> Solo cascarón: llenar con datos de ejemplo
          </button>
        )}
      </div>

      <Tarjeta titulo="Hoja 1 · Entrevista al aspirante">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Pregunta t="Áreas de interés para su tesis (en orden de preferencia)">
              <div className="grid gap-2 sm:grid-cols-3">
                {area(0)}
                {area(1)}
                {area(2)}
              </div>
            </Pregunta>
          </div>
          <Pregunta t="Preferencia de horario">
            <Opciones nombre="Horario" opciones={["Matutino", "Vespertino", "Indistinto"] as const} valor={h.horario} onChange={(v) => set({ horario: v })} />
          </Pregunta>
          <Pregunta t="¿Solicitará beca SECIHTI?">
            <Opciones nombre="Beca SECIHTI" opciones={SI_NO} valor={h.becaSecihti} onChange={(v) => set({ becaSecihti: v })} />
          </Pregunta>
          <Pregunta t="¿Continuaría el proceso aún sin beca?">
            <Opciones nombre="Sin beca" opciones={SI_NO} valor={h.sinBeca} onChange={(v) => set({ sinBeca: v })} />
          </Pregunta>
          <Pregunta t="¿Hay algún profesor del CIDETEC con el que le interese trabajar?">
            <Opciones nombre="Profesor de interés" opciones={SI_NO} valor={h.profesorInteres} onChange={(v) => set({ profesorInteres: v })} />
            {h.profesorInteres === "Sí" && <input aria-label="Nombre del profesor" placeholder="Nombre del profesor" value={h.profesorNombre ?? ""} onChange={(e) => set({ profesorNombre: e.target.value })} className={`${inputBase} mt-2`} />}
          </Pregunta>
          <Pregunta t="¿Tiene dos habilidades de inglés acreditadas?">
            <Opciones nombre="Inglés" opciones={SI_NO} valor={h.ingles2} onChange={(v) => set({ ingles2: v })} />
            <input aria-label="Situación del inglés" placeholder="Situación de su constancia (opcional)" value={h.inglesSituacion ?? ""} onChange={(e) => set({ inglesSituacion: e.target.value })} className={`${inputBase} mt-2`} />
          </Pregunta>
          <Pregunta t="¿Tiene certificado de estudios?">
            <Opciones nombre="Certificado" opciones={SI_NO} valor={h.certificado} onChange={(v) => set({ certificado: v })} />
            <input aria-label="Situación del certificado" placeholder="Situación del certificado (opcional)" value={h.certificadoSituacion ?? ""} onChange={(e) => set({ certificadoSituacion: e.target.value })} className={`${inputBase} mt-2`} />
          </Pregunta>
          <Pregunta t="Promedio y escuela de procedencia">
            <p className="text-gray-700">
              {a.promedio} · {a.procedencia}
            </p>
            <p className="text-xs text-gray-500">Se toman del registro del aspirante.</p>
          </Pregunta>
          <div className="md:col-span-2">
            <Pregunta t="Argumentación final del aspirante (¿por qué recomendar su ingreso?)">
              <textarea aria-label="Argumentación final" rows={2} maxLength={900} value={h.argumentacion ?? ""} onChange={(e) => set({ argumentacion: e.target.value })} className={inputBase} />
            </Pregunta>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Hoja 2 · Conclusiones de los profesores entrevistadores">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-gray-500">
              <tr>
                <th className="py-2 font-medium">Consideración</th>
                {(["MB", "B", "R", "M", "NA"] as Valoracion[]).map((v) => (
                  <th key={v} className="py-2 text-center font-medium">
                    {VALORACION_TEXTO[v]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {CRITERIOS_ACTA.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-3">
                    <span className="block text-[11px] uppercase tracking-wide text-gray-400">{c.grupo}</span>
                    <span className="text-gray-800">{c.t}</span>
                  </td>
                  {(["MB", "B", "R", "M", "NA"] as Valoracion[]).map((v) => (
                    <td key={v} className="py-2 text-center">
                      {v === "NA" && !("na" in c) ? null : (
                        <input
                          type="radio"
                          name={`criterio-${c.id}`}
                          aria-label={`${c.t}: ${VALORACION_TEXTO[v]}`}
                          checked={criterios[c.id] === v}
                          onChange={() => setCriterios({ ...criterios, [c.id]: v })}
                          className="h-4 w-4 accent-[var(--color-primary)]"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-gray-900">Proyección a futuro</span>
            <textarea rows={2} value={proyeccion} onChange={(e) => setProyeccion(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="font-medium text-gray-900">Observaciones generales</span>
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
        </div>
        <div className="mt-4">
          <Pregunta t="¿Continuar proceso de admisión?">
            <div className="flex flex-wrap gap-2">
              {(["Aprobado", "Con reservas", "Rechazado"] as Resolucion[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResolucion(r)}
                  className={`rounded-full border px-3.5 py-1 text-sm ${resolucion === r ? TONO_RESOLUCION[r] : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  {TEXTO_CONTINUAR[r]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">La entrevista no lleva ponderación: Sí = aprobado, Con reservas, No = rechazado.</p>
          </Pregunta>
          {resolucion && resolucion !== "Aprobado" && (
            <label className="mt-3 block text-sm">
              <span className="font-medium text-gray-900">Motivo</span>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${inputBase} mt-1`} />
            </label>
          )}
          {resolucion === "Rechazado" && (
            <div className="mt-3">
              <Aviso tono="error" titulo="Efecto de un “No”">
                <span className="flex items-start gap-1.5">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Cuando firmen los 3 profesores entrevistadores, el proceso del aspirante concluye.
                </span>
              </Aviso>
            </div>
          )}
        </div>
      </Tarjeta>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${faltan.length ? "text-gray-500" : "text-emerald-700"}`}>{faltan.length ? `Falta: ${faltan.join(", ")}.` : "El acta está completa."}</p>
        <div className="flex gap-2">
          {onCancelar && (
            <button type="button" className={botonSecundario} onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button type="button" className={botonPrimario} disabled={!!faltan.length} onClick={guardar}>
            <CheckCircle2 size={15} /> Guardar acta
          </button>
        </div>
      </div>
    </>
  );
}
