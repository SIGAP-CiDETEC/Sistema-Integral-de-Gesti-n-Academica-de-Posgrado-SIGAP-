"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Send, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Tarjeta, botonPeligro, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { fechaCorta, type AspiranteP } from "@/lib/posgrado/datos";

/** Aval de las constancias de inglés con la DFLE (RF-9, RF-53, RN-09). */
export default function AvalIngles() {
  const { aspirantes, cargado, bitacora } = usePosgrado();
  if (!cargado) return null;
  const pendientes = aspirantes.filter((a) => !a.concluido && a.documentos.some((d) => d.id === "ingles" && d.estado === "aval"));
  const resueltos = bitacora.filter((b) => /Aval DFLE|No avalada por la DFLE/.test(b.accion)).slice(0, 10);

  return (
    <>
      <PageHeader titulo="Aval de inglés (DFLE)" subtitulo="Constancias que no son de CELEX/CENLEX y Posgrado turnó para su aval" />
      <div className="mb-6">
        <Aviso tono="info" titulo="Cómo funciona">
          Posgrado revisa la constancia: si es de CELEX o CENLEX la aprueba directo; si es de otra institución la turna aquí. Control Escolar la envía a
          la Dirección de Formación en Lenguas Extranjeras (DFLE) y registra si fue avalada o no.
        </Aviso>
      </div>
      <div className="space-y-4">
        {pendientes.map((a) => (
          <FilaAval key={a.id} a={a} />
        ))}
        {!pendientes.length && <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">No hay constancias pendientes de aval.</p>}
      </div>
      {resueltos.length > 0 && (
        <Tarjeta titulo="Resueltas recientemente" className="mt-6">
          <ul className="space-y-1.5 text-sm">
            {resueltos.map((b, i) => (
              <li key={i} className="text-gray-700">
                <span className="text-xs text-gray-400">{fechaCorta(b.fecha)}</span> · {b.accion}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}

function FilaAval({ a }: { a: AspiranteP }) {
  const { actualizarUteycv, marcarDoc, enviarAviso } = usePosgrado();
  const doc = a.documentos.find((d) => d.id === "ingles")!;
  const [oficio, setOficio] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(false);
  const enviado = a.uteycv?.avalEnviadoEl;

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{a.nombre}</p>
          <p className="text-xs text-gray-500">
            {a.id} · {a.correo}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-primary">
            <FileText size={12} /> {doc.archivo ?? "constancia.pdf"}
          </p>
          {doc.observacion && <p className="mt-1 text-xs text-gray-500">Nota de Posgrado: {doc.observacion}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${enviado ? "bg-indigo-50 text-primary" : "bg-amber-50 text-amber-800"}`}>
          {enviado ? `Enviada a la DFLE el ${fechaCorta(enviado)}${a.uteycv?.avalOficio ? ` · oficio ${a.uteycv.avalOficio}` : ""}` : "Por enviar a la DFLE"}
        </span>
      </div>

      {!enviado ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="text-gray-700">Número de oficio (opcional)</span>
            <input value={oficio} onChange={(e) => setOficio(e.target.value)} placeholder="Ej. UTEyCV/123/2026" className={`${inputBase} mt-1 w-56`} />
          </label>
          <button
            type="button"
            className={botonPrimario}
            onClick={() =>
              actualizarUteycv(a.id, { avalEnviadoEl: new Date().toISOString(), avalOficio: oficio.trim() || undefined }, `Envió la constancia de inglés a la DFLE para su aval${oficio.trim() ? ` (oficio ${oficio.trim()})` : ""}`)
            }
          >
            <Send size={15} /> Registrar envío a la DFLE
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">Motivo (obligatorio si no fue avalada)</span>
            <input
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(false);
              }}
              placeholder="Ej. La DFLE no reconoce el nivel B1 en dos habilidades"
              className={`${inputBase} mt-1 ${error ? "border-red-400" : ""}`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={botonPrimario}
              onClick={() => {
                marcarDoc(a.id, "ingles", "aprobado", `Aval DFLE registrado por UTEyCV${a.uteycv?.avalOficio ? ` (oficio ${a.uteycv.avalOficio})` : ""}`);
                enviarAviso([a.id], "ambos", "Tu constancia de inglés fue avalada por la DFLE", `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nLa DFLE avaló tu constancia de inglés. Tu expediente continúa en revisión con el Departamento de Posgrado.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`);
              }}
            >
              <CheckCircle2 size={15} /> Registrar aval
            </button>
            <button
              type="button"
              className={botonPeligro}
              onClick={() => {
                if (!motivo.trim()) return setError(true);
                marcarDoc(a.id, "ingles", "observado", `No avalada por la DFLE: ${motivo.trim()}`);
                enviarAviso([a.id], "ambos", "Tu constancia de inglés no fue avalada", `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nLa DFLE no avaló tu constancia de inglés: ${motivo.trim()}.\nPuedes subir una constancia de CELEX o CENLEX, o solicitar prórroga al Departamento de Posgrado.\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`);
              }}
            >
              <XCircle size={15} /> No fue avalada
            </button>
            <button type="button" className={botonSecundario} onClick={() => actualizarUteycv(a.id, { avalEnviadoEl: undefined, avalOficio: undefined }, "Canceló el registro de envío a la DFLE")}>
              Deshacer envío
            </button>
          </div>
        </div>
      )}
    </Tarjeta>
  );
}
