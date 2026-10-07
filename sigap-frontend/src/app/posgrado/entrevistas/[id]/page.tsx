"use client";

import Link from "next/link";
import { use, useState } from "react";
import { BellRing, CalendarCheck, CheckCircle2, Pencil } from "lucide-react";
import { ActaVista, FirmasActa, TONO_RESOLUCION } from "@/components/profesor/ActaVista";
import { PageHeader } from "@/components/PageHeader";
import { fechaRecordatorio, recordatoriosEntrevista } from "@/lib/recordatorios";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Migas, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { AvisoAspirante } from "@/components/posgrado/AvisoAspirante";
import {
  PROFESORES_SINODO,
  fechaCorta,
  firmasActa,
  nombreProfesor,
  profesorValido,
  type AspiranteP,
  type Entrevista,
} from "@/lib/posgrado/datos";

/** Programar entrevista y dar seguimiento al acta del sínodo (el dictamen lo registran los profesores). */
export default function EntrevistaAspirante({ params }: PageProps<"/posgrado/entrevistas/[id]">) {
  const { id } = use(params);
  const { porId, cargado } = usePosgrado();
  const [reprogramar, setReprogramar] = useState(false);
  if (!cargado) return null;
  const a = porId(id);
  if (!a) return <p className="text-sm text-gray-600">No existe el aspirante {id}.</p>;

  const puedeProgramar = a.etapa === "entrevista" && !a.dictamen && !a.concluido;

  return (
    <>
      <Migas items={[{ t: "Entrevistas", href: "/posgrado/entrevistas" }, { t: a.id }]} />
      <PageHeader titulo={a.dictamen ? "Dictamen de entrevista" : a.entrevista && !reprogramar ? "Dictamen de entrevista" : "Programar entrevista"} subtitulo={`${a.nombre} · ${a.id}`} />

      {a.etapa === "documentos" || a.etapa === "registro" ? (
        <Aviso tono="alerta" titulo="Aún no es elegible">
          Primero hay que aprobar su expediente.{" "}
          <Link href={`/posgrado/aspirantes/${a.id}`} className="underline">
            Ir a revisión de expediente
          </Link>
        </Aviso>
      ) : !a.entrevista || reprogramar ? (
        puedeProgramar ? (
          <Programar a={a} alTerminar={() => setReprogramar(false)} />
        ) : null
      ) : (
        <div className="space-y-6">
          <Tarjeta
            titulo={<span className="flex items-center gap-2"><CalendarCheck size={17} className="text-primary" /> Cita</span>}
            accion={
              puedeProgramar && (
                <button type="button" className={botonSecundario} onClick={() => setReprogramar(true)}>
                  <Pencil size={14} /> Reprogramar
                </button>
              )
            }
          >
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              <Dato k="Fecha" v={fechaCorta(a.entrevista.fecha)} />
              <Dato k="Hora" v={`${a.entrevista.hora} h`} />
              <Dato k="Modalidad" v={a.entrevista.modalidad} />
              <Dato k="Sala / enlace" v={a.entrevista.sala} />
            </dl>
            <p className="mt-3 text-sm text-gray-600">Sínodo: {a.entrevista.sinodo.map(nombreProfesor).join(" · ")}</p>
            {!a.dictamen && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-navy-800">
                <BellRing size={15} className="mt-0.5 shrink-0" />
                <span>
                  Recordatorios automáticos al aspirante, por correo y en SIGAP:{" "}
                  {recordatoriosEntrevista(a.entrevista, a.nombre.split(" ")[0])
                    .map((r, i) => `${i === 0 ? "un día antes" : "una hora antes"} (${fechaRecordatorio(r.cuando)})`)
                    .join(" y ")}
                  .
                </span>
              </p>
            )}
          </Tarjeta>
          {!a.dictamen && <AvisoAspirante aspirante={a.id} nombre={a.nombre} plantillas={plantillasEntrevista(a)} />}
          {a.dictamen ? <DictamenRegistrado a={a} /> : a.concluido ? null : <EsperandoActa a={a} />}
        </div>
      )}
    </>
  );
}

const cita = (e: Entrevista) =>
  `${fechaCorta(e.fecha)} a las ${e.hora} h · ${e.modalidad} · ${e.sala}`;

/** Plantillas de aviso sobre la entrevista (el aspirante no ve quiénes integran el sínodo). */
function plantillasEntrevista(a: AspiranteP) {
  const e = a.entrevista!;
  const hola = `Estimado(a) ${a.nombre.split(" ")[0]}:\n\n`;
  const firma = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";
  return [
    { id: "fecha", t: "Cambio de fecha u hora", asunto: "Cambio en la fecha de tu entrevista colegiada", mensaje: `${hola}Tu entrevista colegiada cambió. Nueva cita: ${cita(e)}.${firma}` },
    { id: "sala", t: "Cambio de sala o enlace", asunto: "Cambio de sala de tu entrevista colegiada", mensaje: `${hola}Tu entrevista sigue el ${fechaCorta(e.fecha)} a las ${e.hora} h, pero ahora será en: ${e.sala}.${firma}` },
    { id: "recordatorio", t: "Recordatorio", asunto: "Recordatorio: entrevista colegiada", mensaje: `${hola}Te recordamos tu entrevista colegiada: ${cita(e)}. Llega 15 minutos antes con una identificación oficial.${firma}` },
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

function Programar({ a, alTerminar }: { a: AspiranteP; alTerminar: () => void }) {
  const { actualizar, aspirantes, enviarAviso } = usePosgrado();
  const [f, setF] = useState({
    fecha: a.entrevista?.fecha ?? "2026-03-18",
    hora: a.entrevista?.hora ?? "10:30",
    modalidad: a.entrevista?.modalidad ?? ("Presencial" as Entrevista["modalidad"]),
    sala: a.entrevista?.sala ?? "Sala de juntas CIDETEC",
  });
  const [sinodo, setSinodo] = useState<string[]>(a.entrevista?.sinodo ?? []);
  const validos = sinodo.filter((s) => profesorValido(PROFESORES_SINODO.find((p) => p.id === s)!));
  const invalidos = PROFESORES_SINODO.filter((p) => !profesorValido(p));

  // Choques: mismo profesor con otra entrevista a la misma fecha y hora
  const choques = aspirantes
    .filter((x) => x.id !== a.id && x.entrevista && !x.dictamen && x.entrevista.fecha === f.fecha && x.entrevista.hora === f.hora)
    .flatMap((x) => x.entrevista!.sinodo.filter((s) => sinodo.includes(s)).map((s) => `${nombreProfesor(s)} ya tiene la entrevista de ${x.nombre} a esa hora.`));

  const listo = validos.length === 3 && f.fecha && f.hora && f.sala.trim() && !choques.length;

  const alternar = (pid: string) => setSinodo((s) => (s.includes(pid) ? s.filter((x) => x !== pid) : s.length < 3 ? [...s, pid] : s));

  const confirmar = () => {
    actualizar(
      a.id,
      { entrevista: { ...f, sinodo, notificadaEl: new Date().toISOString() } },
      `${a.entrevista ? "Reprogramó" : "Programó"} la entrevista: ${fechaCorta(f.fecha)} ${f.hora} h (${f.modalidad}, ${f.sala}); sínodo: ${sinodo
        .map(nombreProfesor)
        .join(", ")}. Notificó al aspirante y a los profesores.`,
    );
    const nueva: Entrevista = { ...f, sinodo, notificadaEl: "" };
    enviarAviso(
      [a.id],
      "ambos",
      a.entrevista ? "Cambio en tu entrevista colegiada" : "Tu entrevista colegiada fue programada",
      `Estimado(a) ${a.nombre.split(" ")[0]}:\n\n${a.entrevista ? "Tu entrevista colegiada cambió. Nueva cita" : "Tu entrevista colegiada quedó programada"}: ${cita(nueva)}.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
    );
    alTerminar();
  };

  return (
    <div className="space-y-6">
      <Etiqueta tono="bg-emerald-50 text-emerald-700">Expediente aprobado</Etiqueta>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={inputBase} />
        </Campo>
        <Campo label="Hora">
          <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={inputBase} />
        </Campo>
        <Campo label="Modalidad">
          <select
            value={f.modalidad}
            onChange={(e) => setF({ ...f, modalidad: e.target.value as Entrevista["modalidad"], sala: e.target.value === "En línea" ? "https://meet.ipn.mx/…" : "Sala de juntas CIDETEC" })}
            className={inputBase}
          >
            <option>Presencial</option>
            <option>En línea</option>
          </select>
        </Campo>
        <Campo label={f.modalidad === "En línea" ? "Enlace" : "Sala"}>
          <input value={f.sala} onChange={(e) => setF({ ...f, sala: e.target.value })} className={inputBase} />
        </Campo>
      </div>

      <Tarjeta titulo="Sínodo — selecciona exactamente 3 profesores colegiados vigentes">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 font-medium">Profesor</th>
                <th className="py-2 font-medium">Línea</th>
                <th className="py-2 font-medium">Colegiado</th>
                <th className="py-2 font-medium">Vigencia</th>
                <th className="py-2 text-right font-medium">Selección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROFESORES_SINODO.map((p) => {
                const ok = profesorValido(p);
                const marcado = sinodo.includes(p.id);
                return (
                  <tr key={p.id} className={ok ? "" : "text-gray-400"}>
                    <td className="py-2.5">{p.nombre}</td>
                    <td className="py-2.5 text-xs">{p.linea}</td>
                    <td className="py-2.5">{p.colegiado ? "Sí" : "No"}</td>
                    <td className="py-2.5">{p.vigencia}</td>
                    <td className="py-2.5 text-right">
                      {ok ? (
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={marcado}
                            disabled={!marcado && sinodo.length >= 3}
                            onChange={() => alternar(p.id)}
                            className="h-4 w-4 accent-[var(--color-primary)]"
                          />
                          {marcado ? "Seleccionado" : "Elegir"}
                        </label>
                      ) : (
                        "No disponible"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      {invalidos.length > 0 && (
        <Aviso tono="alerta" titulo="Profesores no válidos para el sínodo">
          {invalidos.map((p) => p.nombre).join(", ")}: no cuentan con nombramiento de profesor colegiado vigente (RN-07).
        </Aviso>
      )}
      {choques.length > 0 && (
        <Aviso tono="error" titulo="Choque de horario">
          {choques.map((c) => (
            <p key={c}>{c}</p>
          ))}
        </Aviso>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${validos.length === 3 ? "text-emerald-700" : "text-gray-600"}`}>{validos.length} de 3 profesores válidos seleccionados</p>
        <div className="flex gap-2">
          {a.entrevista && (
            <button type="button" className={botonSecundario} onClick={alTerminar}>
              Cancelar
            </button>
          )}
          <button type="button" className={botonPrimario} disabled={!listo} onClick={confirmar}>
            <CheckCircle2 size={15} /> Confirmar y notificar
          </button>
        </div>
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

/** El dictamen lo registra el sínodo en su sesión de Profesor (acta MTC-EC firmada por los 3). */
function EsperandoActa({ a }: { a: AspiranteP }) {
  const n = firmasActa(a);
  return (
    <>
      <Tarjeta titulo="Acta del sínodo (MTC-EC)">
        <p className="text-sm text-gray-600">
          Los profesores del sínodo llenan y firman el acta en su sesión de Profesor. Cuando firman los 3, el dictamen se aplica solo y se avisa al aspirante.
        </p>
        <p className="mt-3 text-sm">
          Estado:{" "}
          <Etiqueta tono={a.actaEntrevista ? "bg-sky-50 text-sky-800" : "bg-gray-100 text-gray-700"}>
            {a.actaEntrevista ? `Acta llenada · ${n} de 3 firmas` : "El sínodo aún no llena el acta"}
          </Etiqueta>
        </p>
        <div className="mt-3">
          <FirmasActa a={a} />
        </div>
      </Tarjeta>
      {a.actaEntrevista && <ActaVista a={a} titulo="Acta capturada (pendiente de firmas)" />}
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
