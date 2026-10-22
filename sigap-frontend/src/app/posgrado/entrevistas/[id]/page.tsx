"use client";

import Link from "next/link";
import { use, useState } from "react";
import { BellRing, CalendarCheck, CheckCircle2, Pencil, Send } from "lucide-react";
import { ActaVista, SinodoActa, TONO_RESOLUCION } from "@/components/profesor/ActaVista";
import { PageHeader } from "@/components/PageHeader";
import { fechaRecordatorio, recordatoriosEntrevista } from "@/lib/recordatorios";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Migas, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { AvisoAspirante } from "@/components/posgrado/AvisoAspirante";
import { citaTexto, usePublicarEntrevistas } from "@/components/posgrado/usePublicarEntrevistas";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";
import {
  PROFESORES_SINODO,
  TONO_PASO_ENTREVISTA,
  fechaCorta,
  lugaresLibres,
  nombramientoDe,
  nombreProfesor,
  pasoEntrevista,
  sinodoCompleto,
  type AspiranteP,
  type Entrevista,
} from "@/lib/posgrado/datos";

/**
 * Entrevista de un aspirante desde Posgrado: captura y actualiza el horario, lo publica a los profesores,
 * ve cómo se asignan los profesores entrevistadores y publica la entrevista al aspirante. El dictamen lo registran los profesores.
 */
export default function EntrevistaAspirante({ params }: PageProps<"/posgrado/entrevistas/[id]">) {
  const { id } = use(params);
  const { porId, cargado } = usePosgrado();
  const { publicarHorario, publicarEntrevista } = usePublicarEntrevistas();
  const [editar, setEditar] = useState(false);
  if (!cargado) return null;
  const a = porId(id);
  if (!a) return <p className="text-sm text-gray-600">No existe el aspirante {id}.</p>;

  const puedeEditar = a.etapa === "entrevista" && !a.dictamen && !a.concluido && !a.actaEntrevista;
  const e = a.entrevista;
  const paso = e ? pasoEntrevista(e) : null;

  return (
    <>
      <Migas items={[{ t: "Entrevistas", href: "/posgrado/entrevistas" }, { t: a.id }]} />
      <PageHeader titulo={a.dictamen ? "Dictamen de entrevista" : e && !editar ? "Entrevista colegiada" : "Horario de entrevista"} subtitulo={`${a.nombre} · ${a.id}`} />

      {a.etapa === "documentos" || a.etapa === "registro" ? (
        <Aviso tono="alerta" titulo="Aún no es elegible">
          Primero hay que aprobar su expediente.{" "}
          <Link href={`/posgrado/aspirantes/${a.id}`} className="underline">
            Ir a revisión de expediente
          </Link>
        </Aviso>
      ) : !e || editar ? (
        puedeEditar ? <Horario a={a} alTerminar={() => setEditar(false)} /> : null
      ) : (
        <div className="space-y-6">
          <Tarjeta
            titulo={
              <span className="flex flex-wrap items-center gap-2">
                <CalendarCheck size={17} className="text-primary" /> Horario {paso && <Etiqueta tono={TONO_PASO_ENTREVISTA[paso]}>{paso}</Etiqueta>}
              </span>
            }
            accion={
              puedeEditar && (
                <button type="button" className={botonSecundario} onClick={() => setEditar(true)}>
                  <Pencil size={14} /> Actualizar horario
                </button>
              )
            }
          >
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              <Dato k="Fecha" v={fechaCorta(e.fecha)} />
              <Dato k="Hora" v={`${e.hora} h`} />
              <Dato k="Modalidad" v={e.modalidad} />
              <Dato k="Sala / enlace" v={e.sala} />
            </dl>

            <div className="mt-4 rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-gray-900">
                Profesores entrevistadores · {e.sinodo.length} de 3 profesores
              </p>
              <ol className="mt-2 grid gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <li key={i} className={`rounded-md px-3 py-2 text-sm ${e.sinodo[i] ? "bg-indigo-50 text-gray-900" : "border border-dashed border-gray-300 text-gray-400"}`}>
                    {e.sinodo[i] ? (
                      <>
                        {nombreProfesor(e.sinodo[i])}
                        <span className="block text-xs text-gray-500">{nombramientoDe(PROFESORES_SINODO.find((p) => p.id === e.sinodo[i])!)}</span>
                      </>
                    ) : (
                      `Lugar ${i + 1} libre`
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-gray-500">Los profesores eligen la entrevista desde su sesión; ven solo el día y la hora hasta que se integran a los profesores entrevistadores.</p>
            </div>

            {paso === "Horario sin publicar" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                <span className="text-gray-700">El horario aún no lo ven los profesores.</span>
                <button type="button" className={botonPrimario} onClick={() => publicarHorario(a)}>
                  <Send size={15} /> Publicar horario a los profesores
                </button>
              </div>
            )}
            {paso === "Esperando profesores" && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                Horario publicado: faltan {lugaresLibres(e)} profesor(es) para completar los profesores entrevistadores. Después podrás publicar la entrevista al aspirante.
              </p>
            )}
            {paso === "Lista para publicar" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2.5 text-sm">
                <span className="text-sky-900">Profesores entrevistadores completos. El aspirante aún no ve su cita.</span>
                <button type="button" className={botonPrimario} onClick={() => publicarEntrevista(a)}>
                  <Send size={15} /> Publicar entrevista al aspirante
                </button>
              </div>
            )}
            {paso === "Publicada al aspirante" && !a.dictamen && (
              <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-navy-800">
                <BellRing size={15} className="mt-0.5 shrink-0" />
                <span>
                  Publicada al aspirante el {fechaCorta(e.notificadaEl)}. Recordatorios automáticos por correo y en SIGAP:{" "}
                  {recordatoriosEntrevista(e, a.nombre.split(" ")[0])
                    .map((r, i) => `${i === 0 ? "un día antes" : "una hora antes"} (${fechaRecordatorio(r.cuando)})`)
                    .join(" y ")}
                  .
                </span>
              </p>
            )}
          </Tarjeta>
          {!a.dictamen && e.notificadaEl && <AvisoAspirante aspirante={a.id} nombre={a.nombre} plantillas={plantillasEntrevista(a)} />}
          {a.dictamen ? <DictamenRegistrado a={a} /> : a.concluido ? null : <EsperandoActa a={a} />}
        </div>
      )}
    </>
  );
}

/** Plantillas de aviso sobre la entrevista (el aspirante no ve quiénes integran los profesores entrevistadores). */
function plantillasEntrevista(a: AspiranteP) {
  const e = a.entrevista!;
  const hola = `Estimado(a) ${a.nombre.split(" ")[0]}:\n\n`;
  const firma = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";
  return [
    { id: "fecha", t: "Cambio de fecha u hora", asunto: "Cambio en la fecha de tu entrevista colegiada", mensaje: `${hola}Tu entrevista colegiada cambió. Nueva cita: ${citaTexto(e)}.${firma}` },
    { id: "sala", t: "Cambio de sala o enlace", asunto: "Cambio de sala de tu entrevista colegiada", mensaje: `${hola}Tu entrevista sigue el ${fechaCorta(e.fecha)} a las ${e.hora} h, pero ahora será en: ${e.sala}.${firma}` },
    { id: "recordatorio", t: "Recordatorio", asunto: "Recordatorio: entrevista colegiada", mensaje: `${hola}Te recordamos tu entrevista colegiada: ${citaTexto(e)}. Llega 15 minutos antes con una identificación oficial.${firma}` },
    { id: "libre", t: "Otro aviso", asunto: "", mensaje: "" },
  ];
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-gray-500">{k}</dt>
      <dd className="font-medium text-gray-900">{v}</dd>
    </div>
  );
}

/** Captura o actualización del horario (Posgrado ya no asigna profesores: ellos eligen la entrevista). */
function Horario({ a, alTerminar }: { a: AspiranteP; alTerminar: () => void }) {
  const { actualizar, aspirantes, enviarAviso, recargar } = usePosgrado();
  const e = a.entrevista;
  const [guardando, setGuardando] = useState(false);
  const [f, setF] = useState(() => ({
    fecha: e?.fecha ?? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    hora: e?.hora ?? "10:30",
    modalidad: e?.modalidad ?? ("Presencial" as Entrevista["modalidad"]),
    sala: e?.sala ?? "Sala de juntas CIDETEC",
  }));
  const sinodo = e?.sinodo ?? [];

  // Choques: algún profesor que ya eligió esta entrevista tiene otra a la nueva fecha y hora
  const choques = aspirantes
    .filter((x) => x.id !== a.id && x.entrevista && !x.dictamen && !x.concluido && x.entrevista.fecha === f.fecha && x.entrevista.hora === f.hora)
    .flatMap((x) => x.entrevista!.sinodo.filter((s) => sinodo.includes(s)).map((s) => `${nombreProfesor(s)} ya tiene otra entrevista (${x.nombre}) a esa hora.`));
  const sinCambio = !!e && e.fecha === f.fecha && e.hora === f.hora && e.modalidad === f.modalidad && e.sala === f.sala;
  const listo = f.fecha && f.hora && f.sala.trim() && !choques.length && !sinCambio;

  const guardar = async () => {
    // Servidor real: la API valida choques y que no exista acta
    if (MODO_API) {
      setGuardando(true);
      try {
        await api(`/aspirantes/${a.id}/entrevista`, { metodo: "PUT", cuerpo: f });
        notificar("Horario guardado", "exito");
        await recargar();
        alTerminar();
      } catch (err) {
        notificar(mensajeDe(err));
      } finally {
        setGuardando(false);
      }
      return;
    }
    const nueva: Entrevista = { ...f, sinodo, horarioPublicadoEl: e?.horarioPublicadoEl, notificadaEl: e?.notificadaEl ?? "" };
    actualizar(
      a.id,
      { entrevista: nueva },
      `${e ? "Actualizó" : "Capturó"} el horario de entrevista: ${citaTexto(f)}${e?.horarioPublicadoEl ? "" : " (sin publicar)"}`,
    );
    // Si el aspirante ya veía su cita, se le avisa del cambio
    if (e?.notificadaEl)
      enviarAviso(
        [a.id],
        "ambos",
        "Cambio en tu entrevista colegiada",
        `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nTu entrevista colegiada cambió. Nueva cita: ${citaTexto(f)}.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
      );
    alTerminar();
  };

  return (
    <div className="space-y-6">
      <Etiqueta tono="bg-emerald-50 text-emerald-700">Expediente aprobado</Etiqueta>
      <Tarjeta titulo="Horario de la entrevista colegiada">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Fecha">
            <input type="date" value={f.fecha} onChange={(ev) => setF({ ...f, fecha: ev.target.value })} className={inputBase} />
          </Campo>
          <Campo label="Hora">
            <input type="time" value={f.hora} onChange={(ev) => setF({ ...f, hora: ev.target.value })} className={inputBase} />
          </Campo>
          <Campo label="Modalidad">
            <select
              value={f.modalidad}
              onChange={(ev) => setF({ ...f, modalidad: ev.target.value as Entrevista["modalidad"], sala: ev.target.value === "En línea" ? "https://meet.ipn.mx/…" : "Sala de juntas CIDETEC" })}
              className={inputBase}
            >
              <option>Presencial</option>
              <option>En línea</option>
            </select>
          </Campo>
          <Campo label={f.modalidad === "En línea" ? "Enlace" : "Sala"}>
            <input value={f.sala} onChange={(ev) => setF({ ...f, sala: ev.target.value })} className={inputBase} />
          </Campo>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {e?.notificadaEl
            ? "El aspirante ya ve esta entrevista: al guardar se le avisa del cambio."
            : e?.horarioPublicadoEl
              ? "El horario ya está publicado a los profesores; se actualizará para ellos."
              : "Después de guardarlo, publícalo para que los profesores (colegiados o de asignatura) lo elijan; ellos ven solo el día y la hora."}
        </p>
      </Tarjeta>

      {choques.length > 0 && (
        <Aviso tono="error" titulo="Choque de horario">
          {choques.map((c) => (
            <p key={c}>{c}</p>
          ))}
        </Aviso>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {e && (
          <button type="button" className={botonSecundario} onClick={alTerminar}>
            Cancelar
          </button>
        )}
        <button type="button" className={botonPrimario} disabled={!listo || guardando} onClick={guardar}>
          <CheckCircle2 size={15} /> {e ? "Guardar cambios" : "Guardar horario"}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="font-medium text-gray-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** El dictamen lo aplican los profesores entrevistadores al subir el acta MTC-EC firmada por los 3. */
function EsperandoActa({ a }: { a: AspiranteP }) {
  return (
    <>
      <Tarjeta titulo="Acta de los profesores entrevistadores (MTC-EC)">
        <p className="text-sm text-gray-600">
          Un profesor entrevistador llena el acta en su sesión; los tres la imprimen y la firman, y el primero que sube el PDF firmado aplica el dictamen (se avisa
          al aspirante).
        </p>
        <p className="mt-3 text-sm">
          Estado:{" "}
          <Etiqueta tono={a.actaEntrevista ? "bg-sky-50 text-sky-800" : "bg-gray-100 text-gray-700"}>
            {a.actaEntrevista ? "Acta llenada · por subir firmada" : sinodoCompleto(a.entrevista) ? "Los profesores entrevistadores aún no llenan el acta" : `Profesores entrevistadores ${a.entrevista?.sinodo.length ?? 0} de 3`}
          </Etiqueta>
        </p>
        <div className="mt-3">
          <SinodoActa a={a} />
        </div>
      </Tarjeta>
      {a.actaEntrevista && <ActaVista a={a} titulo="Acta llenada (pendiente de subir firmada)" />}
    </>
  );
}

function DictamenRegistrado({ a }: { a: AspiranteP }) {
  const d = a.dictamen!;
  return (
    <>
      <Tarjeta titulo="Dictamen registrado">
        <p className="text-sm">
          Resolución: <span className={`rounded-full border px-2.5 py-0.5 ${TONO_RESOLUCION[d.resolucion]}`}>{d.resolucion}</span>
        </p>
        {d.comentarios && <p className="mt-2 text-sm text-gray-700">“{d.comentarios}”</p>}
        <p className="mt-2 text-xs text-gray-500">Registrado el {fechaCorta(d.registradoEl)}</p>
      </Tarjeta>
      {a.actaEntrevista && <ActaVista a={a} />}
    </>
  );
}
