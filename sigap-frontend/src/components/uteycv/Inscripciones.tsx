"use client";

import Link from "next/link";
import { useState } from "react";
import { useRef } from "react";
import { CheckCircle2, Circle, FileUp, GraduationCap, Send, TriangleAlert, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Regresar, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { PROGRAMA_INDIVIDUAL_DEMO, nombreAsesor } from "@/lib/programa-individual";
import {
  FORMATOS_INSCRIPCION,
  TONO_INSCRIPCION,
  diasPara,
  estadoInscripcion,
  fechaCorta,
  pendientesInscripcion,
  prorrogasDe,
  puedeInscribirse,
  type AspiranteP,
} from "@/lib/posgrado/datos";

/** Número de registro SICEP: letra y 6 dígitos (ej. B260842). */
const SICEP = /^[A-Z]\d{6}$/;

/**
 * Inscripciones (Módulos 7, 8 y 19 · RF-27 a RF-31, RN-10 a RN-12): expediente de inscripción del admitido
 * (foto, SIP-01, SIP-05, SIP-06 y SIP-08), versiones con todas las firmas y número SICEP.
 */
export function Inscripciones({ inicial }: { inicial?: string }) {
  const { aspirantes, cargado } = usePosgrado();
  const [sel, setSel] = useState(inicial);
  if (!cargado) return null;
  const lista = aspirantes.filter((a) => !!a.turnadoUteycv && a.resolucion !== "No aceptado" && !a.concluido);
  const actual = lista.find((a) => a.id === sel) ?? lista.find((a) => !a.uteycv?.formalizadoEl) ?? lista[0];

  return (
    <>
      <Regresar href="/uteycv" t="Inicio" />
      <PageHeader titulo="Inscripciones" subtitulo="Expediente de inscripción de los admitidos y registro del número SICEP" />
      {!lista.length ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Aún no hay admitidos con dictamen.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <ul className="space-y-2">
            {lista.map((a) => {
              const e = estadoInscripcion(a);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSel(a.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${actual?.id === a.id ? "border-primary bg-indigo-50/60" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="mb-1.5 text-xs text-gray-500">{a.uteycv?.sicep ?? a.id}</p>
                    <Etiqueta tono={TONO_INSCRIPCION[e]}>{e}</Etiqueta>
                  </button>
                </li>
              );
            })}
          </ul>
          {actual && <Detalle key={actual.id} a={actual} />}
        </div>
      )}
    </>
  );
}

function Detalle({ a }: { a: AspiranteP }) {
  const { actualizarUteycv, enviarAviso } = usePosgrado();
  const u = a.uteycv ?? {};
  const [sicep, setSicep] = useState(u.sicep ?? (a.enVivo ? PROGRAMA_INDIVIDUAL_DEMO.noRegistro : ""));
  const [aceptaProrroga, setAceptaProrroga] = useState(false);
  const pend = pendientesInscripcion(a);
  const dedicacion = a.dedicacion;
  const prorrogas = prorrogasDe(a);
  const vencidas = prorrogas.filter((d) => diasPara(d.prorrogaHasta!) < 0);
  const nombre = a.nombre.split(" ")[0];

  if (!puedeInscribirse(a))
    return (
      <Aviso tono="alerta" titulo="Primero publica su dictamen SIP-04">
        <Link href={`/uteycv/dictamen?id=${a.id}`} className="underline">
          Ir al SIP-04 de {a.nombre}
        </Link>
      </Aviso>
    );

  if (u.formalizadoEl)
    return (
      <Tarjeta titulo={<span className="flex items-center gap-2"><GraduationCap size={18} className="text-emerald-700" /> Inscripción formalizada</span>}>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Número de registro (SICEP)</dt>
            <dd className="font-mono text-lg font-semibold text-gray-900">{u.sicep}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Dedicación</dt>
            <dd className="font-medium text-gray-900">{a.dedicacion}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Inscrito el</dt>
            <dd className="font-medium text-gray-900">{fechaCorta(u.formalizadoEl)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-gray-600">
          Su ID temporal <span className="font-mono">{a.id}</span> ya no sirve para entrar; inicia sesión con su número de registro y cambia su contraseña (RF-30, RN-12).
        </p>
      </Tarjeta>
    );

  return (
    <div className="space-y-5">
      <Tarjeta titulo="Programa individual (SIP-08)">
        {u.sip08PublicadoEl ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Publicado el {fechaCorta(u.sip08PublicadoEl)} · {u.sip08Firmado ? "el aspirante ya lo subió firmado" : "esperando que lo firme y lo suba"}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Lo prepara su asesor académico ({nombreAsesor()}) con Control Escolar. Al publicarlo, el aspirante lo descarga, firma y sube.
            </p>
            <button
              type="button"
              className={botonPrimario}
              onClick={() => {
                actualizarUteycv(a.id, { sip08PublicadoEl: new Date().toISOString() }, "Publicó el programa individual (SIP-08) preparado por el asesor");
                enviarAviso([a.id], "ambos", "Tu programa individual (SIP-08) está listo", `Estimado(a) ${nombre}:\n\nTu asesor académico preparó tu programa individual de actividades (SIP-08). Descárgalo en SIGAP (Inscripción), fírmalo y súbelo escaneado.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`);
              }}
            >
              <Send size={15} /> Publicar SIP-08 al aspirante
            </button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Expediente de inscripción (RF-27, RF-28)">
        <ExpedienteInscripcion a={a} />
        {prorrogas.length > 0 && (
          <div className="mt-4">
            <Aviso tono={vencidas.length ? "error" : "alerta"} titulo={vencidas.length ? "Prórroga vencida" : "Documentos en prórroga"}>
              <ul className="list-disc pl-5">
                {prorrogas.map((d) => (
                  <li key={d.id}>
                    {d.nombre}: {diasPara(d.prorrogaHasta!) < 0 ? "venció" : "vence"} el {fechaCorta(d.prorrogaHasta!)}
                  </li>
                ))}
              </ul>
              {vencidas.length ? (
                <p className="mt-1">No se puede formalizar hasta que entregue el documento o Posgrado amplíe la prórroga.</p>
              ) : (
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={aceptaProrroga} onChange={(e) => setAceptaProrroga(e.target.checked)} className="h-4 w-4" />
                  Formalizar de todos modos; lo entregará antes de la fecha límite.
                </label>
              )}
            </Aviso>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Registro SICEP">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm">
            <span className="text-gray-700">Dedicación (RN-10)</span>
            <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900">{dedicacion ?? "Aún no la elige"}</p>
            <span className="text-xs text-gray-500">La eligió el aspirante al revisar su dictamen; se registra así en SICEP.</span>
          </div>
          <label className="text-sm">
            <span className="text-gray-700">Número de registro (boleta SICEP)</span>
            <input value={sicep} onChange={(e) => setSicep(e.target.value.toUpperCase().trim())} placeholder="Ej. B260842" className={`${inputBase} mt-1 font-mono ${sicep && !SICEP.test(sicep) ? "border-red-400" : ""}`} />
            {sicep && !SICEP.test(sicep) && <span className="text-xs text-red-600">Formato: una letra y 6 dígitos.</span>}
          </label>
        </div>
        <Aviso tono="info" titulo="Sustitución de identificador (RN-12)">
          Al formalizar, el número de registro sustituye al ID temporal {a.id} para iniciar sesión y se le avisa por correo que debe cambiar su contraseña.
        </Aviso>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{pend.filter((p) => !p.ok).length ? `Falta: ${pend.filter((p) => !p.ok).map((p) => p.t).join(", ")}` : "Expediente completo"}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={botonPrimario}
              disabled={!pend.every((p) => p.ok) || !SICEP.test(sicep) || vencidas.length > 0 || (prorrogas.length > 0 && !aceptaProrroga)}
              onClick={() => {
                actualizarUteycv(a.id, { sicep, formalizadoEl: new Date().toISOString() }, `Formalizó la inscripción con número de registro ${sicep} (${dedicacion?.toLowerCase()})`);
                enviarAviso(
                  [a.id],
                  "correo",
                  `Concluyó tu inscripción · tu número de registro es ${sicep}`,
                  `Estimado(a) ${nombre}:\n\nControl Escolar registró tu número SICEP. A partir de ahora inicias sesión con tu número de registro ${sicep}; tu ID temporal ${a.id} deja de ser válido. Al entrar se te pedirá cambiar tu contraseña.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`,
                );
              }}
            >
              <GraduationCap size={15} /> Formalizar inscripción
            </button>
          </div>
        </div>
      </Tarjeta>
      {a.enVivo && (
        <p className="flex items-start gap-1.5 text-xs text-gray-500">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" /> Al formalizar a María, su sesión de aspirante recibe el aviso y ya puede entrar como alumna con su número de registro.
        </p>
      )}
    </div>
  );
}

/** Formatos entregados por el admitido y versiones con todas las firmas que carga Control Escolar (RF-28). */
function ExpedienteInscripcion({ a }: { a: AspiranteP }) {
  const { actualizarUteycv } = usePosgrado();
  const u = a.uteycv ?? {};
  const input = useRef<HTMLInputElement>(null);
  const [clave, setClave] = useState<string | null>(null);
  const finales = u.firmadosFinales ?? {};

  const cargar = (file: File | undefined) => {
    if (!file || !clave) return;
    actualizarUteycv(a.id, { firmadosFinales: { ...finales, [clave]: { nombre: file.name, el: new Date().toISOString() } } }, `Cargó la versión con todas las firmas del ${clave.toUpperCase()} (${file.name})`);
    setClave(null);
    if (input.current) input.current.value = "";
  };

  return (
    <>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => cargar(e.target.files?.[0])} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-2 font-medium">Documento</th>
              <th className="py-2 font-medium">Entregó el admitido</th>
              <th className="py-2 font-medium">Versión con todas las firmas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2.5 text-gray-900">Fotografía</td>
              <td className="py-2.5">
                <Marca ok={!!u.foto} />
              </td>
              <td className="py-2.5 text-xs text-gray-400">No aplica</td>
            </tr>
            {FORMATOS_INSCRIPCION.map((f) => {
              const final = finales[f.clave];
              const disponible = f.clave !== "sip-08" || !!u.sip08PublicadoEl;
              return (
                <tr key={f.clave}>
                  <td className="py-2.5 text-gray-900">{f.t}</td>
                  <td className="py-2.5">{disponible ? <Marca ok={!!u[f.campo]} /> : <span className="text-xs text-gray-400">SIP-08 sin publicar</span>}</td>
                  <td className="py-2.5">
                    {final ? (
                      <span className="text-xs text-emerald-700">
                        {final.nombre} · {fechaCorta(final.el)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`${botonSecundario} px-2.5 py-1 text-xs`}
                        onClick={() => {
                          setClave(f.clave);
                          input.current?.click();
                        }}
                      >
                        <FileUp size={13} /> Cargar firmado
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Cuando el formato ya tiene las firmas del asesor y de la jefatura, carga aquí el PDF final; reemplaza al que subió el admitido en su expediente.
      </p>
      {a.enVivo ? (
        <p className="mt-2 text-xs text-gray-500">La foto y los formatos firmados los sube María en su sesión (Aspirante → Inscripción).</p>
      ) : (
        (!u.foto || FORMATOS_INSCRIPCION.some((f) => !u[f.campo] && (f.clave !== "sip-08" || u.sip08PublicadoEl))) && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 underline"
            onClick={() =>
              actualizarUteycv(
                a.id,
                { foto: true, sip01Firmado: true, sip05Firmado: true, sip06Firmado: true, sip08Firmado: !!u.sip08PublicadoEl },
                "El admitido subió su foto y formatos firmados (simulado)",
              )
            }
          >
            <Wand2 size={12} /> Solo cascarón: simular que el admitido subió lo que falta
          </button>
        )
      )}
    </>
  );
}

function Marca({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
      <CheckCircle2 size={14} /> Recibido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Circle size={14} /> Pendiente
    </span>
  );
}
