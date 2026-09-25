"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Download, FileSignature, Loader2, Paperclip, Upload, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { generarPdfConValores } from "@/lib/pdf/cliente";
import { TONO_UTEYCV, estadoUteycv, fechaCorta, partesNombre, type AspiranteP } from "@/lib/posgrado/datos";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Dictamen del proceso de admisión (SIP-04): lo elabora UTEyCV, recaba firmas y lo publica al aspirante. */
export function DictamenSip04({ inicial }: { inicial?: string }) {
  const { aspirantes, cargado } = usePosgrado();
  const [sel, setSel] = useState(inicial);
  if (!cargado) return null;
  const turnados = aspirantes.filter((a) => a.etapa === "matricula");
  const actual = turnados.find((a) => a.id === sel) ?? turnados.find((a) => !a.uteycv?.sip04PublicadoEl) ?? turnados[0];

  return (
    <>
      <PageHeader titulo="Dictamen SIP-04" subtitulo="Elaborar, recabar firmas y publicar el dictamen del proceso de admisión" />
      {!turnados.length ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Posgrado aún no turna aspirantes.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <ul className="space-y-2">
            {turnados.map((a) => {
              const e = estadoUteycv(a);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSel(a.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${actual?.id === a.id ? "border-primary bg-indigo-50/60" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="mb-1.5 text-xs text-gray-500">
                      {a.id} · {a.resolucion}
                    </p>
                    <Etiqueta tono={TONO_UTEYCV[e]}>{e}</Etiqueta>
                  </button>
                </li>
              );
            })}
          </ul>
          {actual && <Pasos key={actual.id} a={actual} />}
        </div>
      )}
    </>
  );
}

function Pasos({ a }: { a: AspiranteP }) {
  const { actualizarUteycv, enviarAviso, acta } = usePosgrado();
  const u = a.uteycv ?? {};
  const [fecha, setFecha] = useState(u.fechaSesion ?? acta?.fecha ?? "");
  const [hora, setHora] = useState(u.horaSesion ?? "12:00");
  // La dedicación la elige el aspirante en su carta protesta (SIP-05); aquí solo se usa
  const dedicacion = a.dedicacion;
  const [archivo, setArchivo] = useState<string>();
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    setGenerando(true);
    try {
      const n = partesNombre(a.nombre);
      const [anio, mes, dia] = fecha.split("-");
      const url = await generarPdfConValores("sip-04", "sip-04.pdf", {
        apellidoPaterno: n.paterno,
        apellidoMaterno: n.materno,
        nombre: n.nombre,
        estatus: dedicacion ?? "",
        horaSesion: hora,
        diaSesion: String(Number(dia ?? "")),
        mesSesion: mes ? MESES[Number(mes) - 1] : "",
        anioSesion: anio ?? "",
      });
      const el = document.createElement("a");
      el.href = url;
      el.download = `SIP-04_${n.paterno.toUpperCase()}.pdf`;
      document.body.appendChild(el);
      el.click();
      el.remove();
    } finally {
      setGenerando(false);
    }
  };

  const pasos = [
    { t: "Elaborar el SIP-04", ok: !!u.sip04ElaboradoEl },
    { t: "El aspirante confirma sus datos", ok: !!u.confirmoSip04 },
    { t: "Firmas de la Comisión y del Colegio", ok: !!u.firmasEl },
    { t: "Publicar el dictamen firmado", ok: !!u.sip04PublicadoEl },
  ];

  return (
    <div className="space-y-5">
      <ol className="grid gap-2 sm:grid-cols-4">
        {pasos.map((p, i) => (
          <li key={p.t} className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${p.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-600"}`}>
            {p.ok ? <CheckCircle2 size={15} className="shrink-0" /> : <Circle size={15} className="shrink-0" />} {i + 1}. {p.t}
          </li>
        ))}
      </ol>

      <Tarjeta titulo={<span className="flex items-center gap-2"><FileSignature size={16} className="text-primary" /> 1. Elaborar</span>}>
        <p className="mb-3 text-sm text-gray-600">
          {a.nombre} · Resolución del Colegio: <b>{a.resolucion}</b>. Los datos del aspirante y su dedicación se llenan solos; tú pones la fecha y hora de la sesión.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-gray-700">Fecha de la sesión</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="text-gray-700">Hora</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <div className="text-sm">
            <span className="text-gray-700">Dedicación</span>
            <p className={`mt-1 rounded-lg border px-3 py-2 ${dedicacion ? "border-gray-200 bg-gray-50 text-gray-900" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
              {dedicacion ?? "Aún no la elige"}
            </p>
            <span className="text-xs text-gray-500">La eligió el aspirante en su carta protesta (SIP-05).</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={botonSecundario} disabled={!fecha || !dedicacion || generando} onClick={descargar}>
            {generando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descargar SIP-04 para firmas
          </button>
          <button
            type="button"
            className={botonPrimario}
            disabled={!fecha || !dedicacion}
            onClick={() =>
              actualizarUteycv(a.id, { fechaSesion: fecha, horaSesion: hora, sip04ElaboradoEl: new Date().toISOString() }, `Elaboró el SIP-04 (sesión del ${fechaCorta(fecha)}, ${hora} h, ${dedicacion?.toLowerCase()})`)
            }
          >
            {u.sip04ElaboradoEl ? "Actualizar datos" : "Registrar como elaborado"}
          </button>
        </div>
        {u.sip04ElaboradoEl && <p className="mt-2 text-xs text-emerald-700">Elaborado el {fechaCorta(u.sip04ElaboradoEl)}</p>}
        {!dedicacion && (
          <p className="mt-2 text-xs text-amber-700">
            {a.enVivo ? "María debe elegirla en su carta protesta (Aspirante → 2. Documentos → SIP-05)." : "El aspirante debe elegirla en su carta protesta (SIP-05)."}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="2. Confirmación del aspirante">
        {u.confirmoSip04 ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> El aspirante revisó y confirmó sus datos.
          </p>
        ) : a.enVivo ? (
          <p className="text-sm text-gray-600">Esperando que confirme sus datos en su sesión (fase 5 · Dictamen final).</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            Esperando que confirme sus datos en su sesión.
            <button type="button" className="inline-flex items-center gap-1 text-xs underline" onClick={() => actualizarUteycv(a.id, { confirmoSip04: true }, "El aspirante confirmó sus datos del SIP-04 (simulado)")}>
              <Wand2 size={12} /> Solo cascarón: simular que confirmó
            </button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="3. Firmas">
        {u.firmasEl ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Firmas recabadas el {fechaCorta(u.firmasEl)}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Miembros de la Comisión de Admisión, Coordinador del programa y Presidente del Colegio de Profesores.</p>
            <button
              type="button"
              className={botonPrimario}
              disabled={!u.sip04ElaboradoEl || !u.confirmoSip04}
              onClick={() => actualizarUteycv(a.id, { firmasEl: new Date().toISOString() }, "Registró las firmas del SIP-04")}
            >
              Registrar firmas recabadas
            </button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="4. Publicar al aspirante">
        {u.sip04PublicadoEl ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Publicado el {fechaCorta(u.sip04PublicadoEl)} · {u.sip04Archivo}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className={`${botonSecundario} cursor-pointer ${!u.firmasEl ? "pointer-events-none opacity-50" : ""}`}>
                <Upload size={15} /> Subir SIP-04 firmado (PDF)
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0]?.name)} />
              </label>
              {archivo && (
                <span className="flex items-center gap-1 text-sm text-gray-700">
                  <Paperclip size={13} /> {archivo}
                </span>
              )}
              {!archivo && u.firmasEl && (
                <button type="button" className="text-xs text-gray-500 underline" onClick={() => setArchivo(`SIP-04_${partesNombre(a.nombre).paterno.toUpperCase()}_firmado.pdf`)}>
                  Solo cascarón: usar un PDF de ejemplo
                </button>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className={botonPrimario}
                disabled={!u.firmasEl || !archivo}
                onClick={() => {
                  actualizarUteycv(a.id, { sip04PublicadoEl: new Date().toISOString(), sip04Archivo: archivo }, `Publicó el SIP-04 firmado (${archivo})`);
                  enviarAviso([a.id], "ambos", "Tu dictamen SIP-04 ya está disponible", `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nTu dictamen del proceso de admisión (SIP-04) ya está firmado y disponible en SIGAP (fase 5 · Dictamen final). Continúa con tu matrícula (fase 6).\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`);
                }}
              >
                Publicar y notificar
              </button>
            </div>
          </>
        )}
      </Tarjeta>
      {a.enVivo && <Aviso tono="info" titulo="Aspirante de este navegador">Lo que publiques aquí le aparece a María en su sesión de aspirante.</Aviso>}
    </div>
  );
}
