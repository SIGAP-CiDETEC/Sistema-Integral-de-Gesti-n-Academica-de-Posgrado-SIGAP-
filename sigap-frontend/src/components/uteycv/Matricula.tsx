"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, GraduationCap, Send, TriangleAlert, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { PROGRAMA_INDIVIDUAL_DEMO, nombreAsesor } from "@/lib/programa-individual";
import {
  TONO_UTEYCV,
  diasPara,
  estadoUteycv,
  fechaCorta,
  pendientesMatricula,
  prorrogasDe,
  type AspiranteP,
} from "@/lib/posgrado/datos";

/** Número de registro SICEP: letra y 6 dígitos (ej. B260842). */
const SICEP = /^[A-Z]\d{6}$/;

/** Formalizar matrícula (RF-29 a RF-31, RN-10, RN-12): SIP-08, SIP-01, dedicación y número SICEP. */
export function Matricula({ inicial }: { inicial?: string }) {
  const { aspirantes, cargado } = usePosgrado();
  const [sel, setSel] = useState(inicial);
  if (!cargado) return null;
  const lista = aspirantes.filter((a) => a.etapa === "matricula");
  const actual = lista.find((a) => a.id === sel) ?? lista.find((a) => !a.uteycv?.formalizadoEl) ?? lista[0];

  return (
    <>
      <PageHeader titulo="Matrícula" subtitulo="Integrar el expediente de inscripción y registrar el número SICEP" />
      {!lista.length ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Posgrado aún no turna aspirantes.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <ul className="space-y-2">
            {lista.map((a) => {
              const e = estadoUteycv(a);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSel(a.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${actual?.id === a.id ? "border-primary bg-indigo-50/60" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="mb-1.5 text-xs text-gray-500">{a.uteycv?.sicep ?? a.id}</p>
                    <Etiqueta tono={TONO_UTEYCV[e]}>{e}</Etiqueta>
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
  const pend = pendientesMatricula(a);
  const dedicacion = a.dedicacion;
  const prorrogas = prorrogasDe(a);
  const vencidas = prorrogas.filter((d) => diasPara(d.prorrogaHasta!) < 0);
  const nombre = a.nombre.split(" ")[0];

  if (!u.sip04PublicadoEl)
    return (
      <Aviso tono="alerta" titulo="Primero publica su dictamen SIP-04">
        <Link href={`/uteycv/dictamen?id=${a.id}`} className="underline">
          Ir al SIP-04 de {a.nombre}
        </Link>
      </Aviso>
    );

  if (u.formalizadoEl)
    return (
      <Tarjeta titulo={<span className="flex items-center gap-2"><GraduationCap size={18} className="text-emerald-700" /> Matrícula formalizada</span>}>
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
            <dt className="text-gray-500">Formalizada</dt>
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
                enviarAviso([a.id], "ambos", "Tu programa individual (SIP-08) está listo", `Estimado(a) ${nombre}:\n\nTu asesor académico preparó tu programa individual de actividades (SIP-08). Descárgalo en SIGAP (fase 6 · Matrícula), fírmalo y súbelo escaneado.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`);
              }}
            >
              <Send size={15} /> Publicar SIP-08 al aspirante
            </button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Expediente de inscripción">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {pend.map((p) => (
            <li key={p.t} className={`flex items-center gap-2 ${p.ok ? "text-emerald-700" : "text-gray-500"}`}>
              {p.ok ? <CheckCircle2 size={15} /> : <Circle size={15} />} {p.t}
            </li>
          ))}
        </ul>
        {a.enVivo ? (
          <p className="mt-3 text-xs text-gray-500">La foto, el SIP-01 y el SIP-08 firmados los sube María en su sesión de aspirante (fase 6 · Matrícula).</p>
        ) : (
          (!u.foto || !u.sip01Firmado || (u.sip08PublicadoEl && !u.sip08Firmado)) && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 underline"
              onClick={() => actualizarUteycv(a.id, { foto: true, sip01Firmado: true, sip08Firmado: !!u.sip08PublicadoEl }, "El aspirante subió foto y formatos firmados (simulado)")}
            >
              <Wand2 size={12} /> Solo cascarón: simular que el aspirante subió lo que falta
            </button>
          )
        )}
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
            <span className="text-xs text-gray-500">La eligió el aspirante en su SIP-05; se registra así en SICEP.</span>
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
                actualizarUteycv(a.id, { sicep, formalizadoEl: new Date().toISOString() }, `Formalizó la matrícula con número de registro ${sicep} (${dedicacion?.toLowerCase()})`);
                enviarAviso(
                  [a.id],
                  "correo",
                  `Concluyó tu inscripción · tu número de registro es ${sicep}`,
                  `Estimado(a) ${nombre}:\n\nControl Escolar registró tu número SICEP. A partir de ahora inicias sesión con tu número de registro ${sicep}; tu ID temporal ${a.id} deja de ser válido. Al entrar se te pedirá cambiar tu contraseña.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`,
                );
              }}
            >
              <GraduationCap size={15} /> Formalizar matrícula
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
