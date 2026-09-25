"use client";

import Link from "next/link";
import { use, useState } from "react";
import { CalendarCheck, CheckCircle2, Pencil, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Migas, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { AvisoAspirante } from "@/components/posgrado/AvisoAspirante";
import {
  ETIQUETA_PUNTAJE,
  MAX_PUNTAJE,
  PROFESORES_SINODO,
  fechaCorta,
  nombreProfesor,
  profesorValido,
  totalPuntaje,
  type AspiranteP,
  type Entrevista,
  type Puntajes,
  type Resolucion,
} from "@/lib/posgrado/datos";

/** Programar entrevista y registrar su dictamen (mockups "Programar entrevista" y "Dictamen de entrevista"). */
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
          </Tarjeta>
          {!a.dictamen && <AvisoAspirante aspirante={a.id} nombre={a.nombre} plantillas={plantillasEntrevista(a)} />}
          {a.dictamen ? <DictamenRegistrado a={a} /> : <CapturarDictamen a={a} />}
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

const TONO_RES: Record<Resolucion, string> = {
  Aprobado: "border-emerald-400 bg-emerald-50 text-emerald-800",
  "Con reservas": "border-amber-400 bg-amber-50 text-amber-800",
  Rechazado: "border-red-400 bg-red-50 text-red-700",
};

function CapturarDictamen({ a }: { a: AspiranteP }) {
  const { actualizar, enviarAviso } = usePosgrado();
  const [p, setP] = useState<Record<keyof Puntajes, string>>({ trayectoria: "", proyecto: "", conocimientos: "", motivacion: "" });
  const [res, setRes] = useState<Resolucion | null>(null);
  const [comentarios, setComentarios] = useState("");
  const num = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Number(v) || 0])) as Puntajes;
  const fuera = (Object.keys(MAX_PUNTAJE) as (keyof Puntajes)[]).filter((k) => p[k] !== "" && (Number(p[k]) < 0 || Number(p[k]) > MAX_PUNTAJE[k]));
  const completos = Object.values(p).every((v) => v !== "");
  const listo = completos && !fuera.length && res && comentarios.trim();

  const registrar = () => {
    if (!res) return;
    const total = totalPuntaje(num);
    actualizar(
      a.id,
      {
        dictamen: { puntajes: num, resolucion: res, comentarios: comentarios.trim(), registradoEl: new Date().toISOString() },
        ...(res === "Rechazado" ? { concluido: "Rechazado en la entrevista colegiada (RN-05)" } : { etapa: "evaluacion" as const }),
      },
      `Registró el dictamen de entrevista: ${res} (${total}/100)${res === "Rechazado" ? ". El proceso queda concluido" : "; pasa a evaluación"}`,
    );
    // Al aspirante solo se le comunica si continúa o no; nunca los puntajes. RN-05: correo general si no continúa
    const nombre = a.nombre.split(" ")[0];
    if (res === "Rechazado")
      enviarAviso([a.id], "ambos", "Resultado de tu proceso de admisión", `Estimado(a) ${nombre}:\n\nAgradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`);
    else
      enviarAviso([a.id], "ambos", "Tu entrevista colegiada fue aprobada", `Estimado(a) ${nombre}:\n\nTu entrevista colegiada fue aprobada. Ingresa a SIGAP (fase 4 · Evaluación) para elegir tu modalidad de evaluación.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(MAX_PUNTAJE) as (keyof Puntajes)[]).map((k) => (
          <Campo key={k} label={`${ETIQUETA_PUNTAJE[k]} / ${MAX_PUNTAJE[k]}`}>
            <input
              type="number"
              min={0}
              max={MAX_PUNTAJE[k]}
              value={p[k]}
              onChange={(e) => setP({ ...p, [k]: e.target.value })}
              className={`${inputBase} ${fuera.includes(k) ? "border-red-400" : ""}`}
            />
          </Campo>
        ))}
      </div>

      <Tarjeta titulo="Resolución">
        <div className="flex flex-wrap gap-2">
          {(["Aprobado", "Con reservas", "Rechazado"] as Resolucion[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRes(r)}
              className={`rounded-full border px-3.5 py-1 text-sm ${res === r ? TONO_RES[r] : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <label htmlFor="comentarios" className="mt-4 block text-sm font-medium text-gray-900">
          Comentarios del sínodo
        </label>
        <textarea id="comentarios" rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} className={`${inputBase} mt-1`} />
        <p className={`mt-4 text-2xl font-semibold ${completos ? "text-emerald-700" : "text-gray-400"}`}>Puntaje total: {totalPuntaje(num)} / 100</p>
        {fuera.length > 0 && <p className="mt-1 text-sm text-red-600">Hay puntajes fuera del rango permitido.</p>}
      </Tarjeta>

      {res === "Rechazado" && (
        <Aviso tono="error" titulo="Efecto de una resolución rechazada">
          <span className="flex items-start gap-1.5">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Rechazado finaliza y bloquea el proceso (RN-05). No se habilitan evaluación ni
            matrícula; la decisión queda registrada en la bitácora.
          </span>
        </Aviso>
      )}

      <div className="flex justify-end">
        <button type="button" className={botonPrimario} disabled={!listo} onClick={registrar}>
          <CheckCircle2 size={15} /> Registrar dictamen
        </button>
      </div>
      <p className="text-right text-xs text-gray-500">El acta firmada por el sínodo (MTC-EC) se adjunta al expediente.</p>
    </>
  );
}

function DictamenRegistrado({ a }: { a: AspiranteP }) {
  const d = a.dictamen!;
  return (
    <Tarjeta titulo="Dictamen registrado">
      <div className="grid gap-3 sm:grid-cols-4">
        {(Object.keys(MAX_PUNTAJE) as (keyof Puntajes)[]).map((k) => (
          <div key={k} className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="text-gray-500">{ETIQUETA_PUNTAJE[k]}</p>
            <p className="font-semibold text-gray-900">
              {d.puntajes[k]} / {MAX_PUNTAJE[k]}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm">
        Resolución: <span className={`rounded-full border px-2.5 py-0.5 ${TONO_RES[d.resolucion]}`}>{d.resolucion}</span> · Puntaje total{" "}
        <b>{totalPuntaje(d.puntajes)}/100</b>
      </p>
      <p className="mt-2 text-sm text-gray-700">“{d.comentarios}”</p>
      <p className="mt-2 text-xs text-gray-500">Registrado el {fechaCorta(d.registradoEl)}</p>
    </Tarjeta>
  );
}
