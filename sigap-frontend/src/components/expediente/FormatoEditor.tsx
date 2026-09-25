"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Wand2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { CAPTURAS_DEMO, REGISTRO_DEMO } from "@/lib/aspirante-datos";
import {
  camposVisibles,
  esVacio,
  faltantes,
  formatoPorClave,
  resolver,
  type CampoFormato,
  type Valor,
} from "@/lib/formatos";
import { faseDe } from "@/lib/fases";
import { generarPdfFormato } from "@/lib/pdf/cliente";
import { useExpediente } from "./ExpedienteProvider";
import { DocumentoAsesor } from "./DocumentoAsesor";
import { FirmasOtros } from "./FirmasOtros";
import { RevisarDictamen } from "./RevisarDictamen";
import { SubirFirmado } from "./SubirFirmado";
import { useBloqueoFormato, useDocumentosFaltantes } from "./bloqueos";
import { TONOS, estadoFormato } from "./estadoFormato";

/**
 * Revisar un formato autollenado y entregarlo:
 * 1) completar datos faltantes → 2) descargar e imprimir → 3) firmar a mano y subir el escaneo.
 * El PDF firmado llega al departamento indicado en `formato.destino`.
 */
export function FormatoEditor({ clave }: { clave: string }) {
  const f = formatoPorClave(clave)!;
  const exp = useExpediente();
  const { ctx, firmados, documentos, cargado, confirmados, recibidos } = exp;
  const [pdf, setPdf] = useState<{ url: string; datos: string } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  const firmado = firmados[f.clave];
  const bloqueo = useBloqueoFormato(f.clave);
  const estado = estadoFormato(f, ctx, firmado, { confirmado: confirmados[f.clave], recibido: recibidos[f.clave] });
  const fase = faseDe(f.fase);
  const editable = f.llena === "aspirante";
  const campos = camposVisibles(f, ctx);
  const foto = documentos.foto?.dataUrl ?? null;
  const datosCompletos = estado.faltan === 0;

  // La vista previa solo es válida para los datos con que se generó
  const datosActuales = JSON.stringify([exp.capturas, foto]);
  const pdfUrl = pdf?.datos === datosActuales ? pdf.url : null;

  // Liberar la URL del PDF anterior
  useEffect(() => () => void (pdf && URL.revokeObjectURL(pdf.url)), [pdf]);

  async function generar(descargar: boolean) {
    setGenerando(true);
    setErrorPdf("");
    try {
      const url = await generarPdfFormato(f, ctx, { foto });
      setPdf({ url, datos: datosActuales });
      if (descargar) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${f.codigo}_${String(ctx.r.apellidoPaterno ?? "aspirante")}.pdf`;
        a.click();
      }
    } catch (e) {
      setErrorPdf(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    } finally {
      setGenerando(false);
    }
  }

  // Agrupar por sección
  const secciones = campos.reduce<Record<string, CampoFormato[]>>((acc, c) => {
    const s = c.seccion ?? "Datos del formato";
    (acc[s] ??= []).push(c);
    return acc;
  }, {});

  return (
    <>
      <Link href={fase.href} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={15} /> Fase {fase.numero}: {fase.titulo}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-guinda">{f.codigo}</p>
          <h1 className="text-2xl text-gray-900 sm:text-3xl">{f.nombre}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{f.descripcion}</p>
        </div>
        {cargado && <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONOS[estado.tono]}`}>{estado.etiqueta}</span>}
      </header>

      {bloqueo && !firmado && !recibidos[f.clave] ? (
        <FormatoBloqueado motivo={bloqueo} />
      ) : f.confirmaAspirante ? (
        <RevisarDictamen formato={f} />
      ) : f.llena === "asesor" ? (
        <DocumentoAsesor formato={f} />
      ) : !editable ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          <p className="flex items-center gap-2 font-medium text-gray-900">
            <Lock size={16} /> {f.llena === "area" ? `Este formato lo emite ${f.destino.replace(/^Aspirante \(lo emite (.*)\)$/, "$1")}.` : "Este formato lo prepara tu asesor académico."}
          </p>
          <p className="mt-2">
            {estado.firmaAspirante
              ? "Cuando esté listo te llegará una notificación para descargarlo, firmarlo a mano y subirlo escaneado."
              : "Cuando se emita, podrás consultarlo y descargarlo desde esta pantalla."}
          </p>
          {f.pdf === "falta-plantilla" && <p className="mt-2 text-amber-700">PDF pendiente: {f.notaPlantilla}</p>}
          <FirmasOtros firmas={f.firmas} recibe={f.destino} />
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                <Sparkles size={12} /> Autollenado con tu registro ({estado.autollenados})
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                <TriangleAlert size={12} /> Falta completar ({estado.faltan})
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                <Lock size={12} /> Lo pone el sistema
              </span>
            </div>

            {Object.entries(secciones).map(([titulo, lista]) => (
              <section key={titulo} className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="font-semibold text-gray-900">{titulo}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {lista.map((c) => (
                    <CampoInput key={c.id} campo={c} valor={resolver(c, ctx)} auto={exp.capturas[c.id] === undefined && !esVacio(c.auto?.(ctx))} onChange={(v) => exp.capturar(c.id, v)} />
                  ))}
                </div>
              </section>
            ))}

            {f.capturaOtros && (
              <p className="flex items-start gap-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                <Clock size={16} className="mt-0.5 shrink-0" /> {f.capturaOtros}
              </p>
            )}
          </div>

          {/* Pasos de entrega */}
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900">Cómo entregarlo</h2>
              <ol className="mt-4 space-y-5">
                <Paso n={1} hecho={datosCompletos} titulo="Completa tus datos">
                  {datosCompletos ? (
                    <p className="text-sm text-gray-600">Todos los datos están completos.</p>
                  ) : (
                    <p className="text-sm text-amber-800">Faltan {estado.faltan} dato(s) marcados en ámbar.</p>
                  )}
                </Paso>

                <Paso n={2} hecho={!!firmado} titulo={estado.firmaAspirante ? "Descárgalo e imprímelo" : "Descárgalo"}>
                  {f.pdf !== "listo" ? (
                    <p className="text-sm text-amber-700">{f.notaPlantilla ?? "La generación del PDF de este formato está pendiente."} Tus datos ya quedan guardados.</p>
                  ) : (
                    <>
                      {f.clave === "sip-01" && !foto && (
                        <p className="mb-2 text-xs text-amber-700">Sube tu fotografía en la fase de Matrícula para que aparezca en el formato.</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => generar(false)}
                          disabled={generando}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {generando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Vista previa
                        </button>
                        <button
                          type="button"
                          onClick={() => generar(true)}
                          disabled={generando || !datosCompletos}
                          title={datosCompletos ? undefined : "Completa los datos para descargarlo"}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          <Download size={15} /> Descargar PDF
                        </button>
                      </div>
                      {errorPdf && <p className="mt-2 text-xs text-red-600">{errorPdf}</p>}
                    </>
                  )}
                </Paso>

                {estado.firmaAspirante ? (
                  <Paso n={3} hecho={!!firmado} titulo="Fírmalo a mano y sube el escaneo" ultimo>
                    <SubirFirmado clave={f.clave} habilitado={datosCompletos} destino={f.destino} />
                  </Paso>
                ) : (
                  <Paso n={3} hecho={datosCompletos} titulo="Listo" ultimo>
                    <p className="flex items-start gap-1.5 text-sm text-gray-600">
                      <Send size={14} className="mt-0.5 shrink-0" />
                      {datosCompletos ? `Tu parte llega a: ${f.destino}.` : `Al completarlo llega a: ${f.destino}.`}
                    </p>
                  </Paso>
                )}
              </ol>

              <FirmasOtros firmas={f.firmas} recibe={f.destino} />
            </section>
          </aside>
        </div>
      )}

      {editable && !bloqueo && <DemoFormato clave={f.clave} />}

      {pdfUrl && (
        <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-5 py-3 text-sm font-medium text-gray-900">Vista previa — {f.codigo} (sin firma)</p>
          <iframe src={pdfUrl} title={`Vista previa ${f.codigo}`} className="h-[80vh] w-full" />
        </section>
      )}
    </>
  );
}

/** Formato que todavía no se puede llenar (RN-11 o RF-22). */
function FormatoBloqueado({ motivo }: { motivo: string }) {
  const faltan = useDocumentosFaltantes();
  const { guardarDocumento } = useExpediente();
  const porDocumentos = motivo.includes("RN-11");
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
      <p className="flex items-center gap-2 font-medium text-gray-900">
        <Lock size={16} /> Este formato aún no está disponible
      </p>
      <p className="mt-2 text-gray-700">{motivo}</p>
      {porDocumentos && (
        <Link href="/aspirante/documentos" className="mt-3 inline-block text-primary underline">
          Ir a subir mis documentos
        </Link>
      )}
      {porDocumentos && faltan.length > 0 && (
        <div className="mt-6 border-t border-dashed border-gray-300 pt-3">
          <p className="text-xs text-gray-500">Vista de prueba (solo cascarón):</p>
          <button
            type="button"
            onClick={() =>
              faltan.forEach((d) => guardarDocumento(d.id, { nombre: `${d.id}_ejemplo.pdf`, bytes: 250_000, fecha: new Date().toISOString() }))
            }
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Wand2 size={12} /> Simular que ya subí mis documentos
          </button>
        </div>
      )}
    </section>
  );
}

/** Foto de ejemplo dibujada en el navegador (solo cascarón). */
function fotoDeEjemplo(): string {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 300;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e5eaf2";
  g.fillRect(0, 0, 240, 300);
  g.fillStyle = "#9aa8bd";
  g.beginPath();
  g.arc(120, 115, 55, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(120, 300, 105, 95, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = "#4b5a72";
  g.font = "bold 16px sans-serif";
  g.textAlign = "center";
  g.fillText("FOTO DE EJEMPLO", 120, 28);
  return c.toDataURL("image/jpeg", 0.85);
}

/** Solo cascarón: llena lo que falta con datos de ejemplo o lo borra para volver a probar. */
function DemoFormato({ clave }: { clave: string }) {
  const f = formatoPorClave(clave)!;
  const { ctx, documentos, capturarVarios, guardarDocumento } = useExpediente();
  const faltan = new Set(faltantes(f, ctx).map((c) => c.id));
  // Lo obligatorio que falta + lo opcional vacío que tenga dato de ejemplo
  const pendientes = camposVisibles(f, ctx).filter(
    (c) => !c.sistema && (faltan.has(c.id) || (esVacio(resolver(c, ctx)) && CAPTURAS_DEMO[c.id] !== undefined)),
  );
  const necesitaFoto = f.clave === "sip-01" && !documentos.foto;

  const llenar = () => {
    const demoCtx = { r: REGISTRO_DEMO, c: {}, hoy: ctx.hoy };
    const valores = Object.fromEntries(
      pendientes.map((c) => [c.id, CAPTURAS_DEMO[c.id] ?? c.auto?.(demoCtx) ?? "Dato de ejemplo"]),
    );
    capturarVarios(valores);
    if (necesitaFoto) {
      guardarDocumento("foto", { nombre: "foto-ejemplo.jpg", bytes: 18_000, fecha: new Date().toISOString(), dataUrl: fotoDeEjemplo() });
    }
  };

  const borrar = () =>
    capturarVarios(Object.fromEntries(f.campos.filter((c) => !c.sistema).map((c) => [c.id, undefined])));

  return (
    <div className="mt-10 border-t border-dashed border-gray-300 pt-4">
      <p className="text-xs text-gray-500">Vista de prueba (solo cascarón):</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={llenar}
          disabled={!pendientes.length && !necesitaFoto}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wand2 size={12} /> Llenar lo que falta con datos de ejemplo{necesitaFoto ? " (incluye foto)" : ""}
        </button>
        <button
          type="button"
          onClick={borrar}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw size={12} /> Borrar lo capturado en este formato
        </button>
      </div>
    </div>
  );
}

function Paso({
  n,
  hecho,
  titulo,
  ultimo,
  children,
}: {
  n: number;
  hecho: boolean;
  titulo: string;
  ultimo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-3">
      {!ultimo && <span className="absolute left-3 top-7 h-[calc(100%-4px)] w-px bg-gray-200" aria-hidden />}
      <span
        className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          hecho ? "bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-600"
        }`}
      >
        {hecho ? <CheckCircle2 size={14} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-sm font-medium text-gray-900">{titulo}</p>
        {children}
      </div>
    </li>
  );
}

const base =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function CampoInput({
  campo: c,
  valor,
  auto,
  onChange,
}: {
  campo: CampoFormato;
  valor: Valor | undefined;
  auto: boolean;
  onChange: (v: Valor) => void;
}) {
  const invalido = !!c.valido && typeof valor === "string" && !esVacio(valor) && !c.valido(valor);
  const falta = (!c.opcional && !c.sistema && esVacio(valor)) || invalido;
  const texto = typeof valor === "string" ? valor : "";
  const borde = falta ? "border-amber-400 bg-amber-50/40" : auto && !invalido ? "border-emerald-300 bg-emerald-50/30" : "border-gray-300 bg-white";
  const ancho = c.tipo === "textarea" || c.tipo === "ranking" || c.tipo === "multi" || (c.tipo === "radio" && (c.opciones?.length ?? 0) > 3) || c.label.length > 45;

  let control: React.ReactNode;
  if (c.sistema) {
    control = <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">{texto || "—"}</div>;
  } else if (c.tipo === "textarea") {
    control = (
      <>
        <textarea id={c.id} rows={5} value={texto} maxLength={c.maxLength} onChange={(e) => onChange(e.target.value)} className={`${base} ${borde} resize-y`} />
        {c.maxLength && <p className="mt-1 text-right text-[11px] text-gray-400">{texto.length} / {c.maxLength}</p>}
      </>
    );
  } else if (c.tipo === "radio") {
    control = (
      <div className="flex flex-wrap gap-2">
        {c.opciones!.map((o) => (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              texto === o ? "border-primary bg-indigo-50 text-primary" : falta ? "border-amber-400 bg-white" : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <input type="radio" name={c.id} checked={texto === o} onChange={() => onChange(o)} className="accent-[var(--color-primary)]" />
            {o}
          </label>
        ))}
      </div>
    );
  } else if (c.tipo === "multi") {
    const lista = Array.isArray(valor) ? valor : [];
    control = (
      <div className="grid gap-2 sm:grid-cols-2">
        {c.opciones!.map((o) => {
          const activo = lista.includes(o);
          return (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                activo ? "border-primary bg-indigo-50 text-primary" : falta ? "border-amber-400 bg-white" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={() => onChange(activo ? lista.filter((x) => x !== o) : [...lista, o])}
                className="accent-[var(--color-primary)]"
              />
              {o}
            </label>
          );
        })}
      </div>
    );
  } else if (c.tipo === "ranking") {
    const orden = Array.isArray(valor) ? valor : [];
    control = (
      <div className="grid gap-2 sm:grid-cols-2">
        {c.opciones!.map((o) => {
          const i = orden.indexOf(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(i >= 0 ? orden.filter((x) => x !== o) : orden.length < 3 ? [...orden, o] : orden)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                i >= 0 ? "border-primary bg-indigo-50 text-primary" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${i >= 0 ? "bg-primary text-white" : "border border-gray-300"}`}>
                {i >= 0 ? i + 1 : ""}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else {
    control = (
      <input id={c.id} value={texto} maxLength={c.maxLength} onChange={(e) => onChange(e.target.value)} className={`${base} ${borde}`} />
    );
  }

  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={c.id} className="text-sm font-medium text-gray-900">
          {c.label} {!c.opcional && !c.sistema && <span className="text-red-600">*</span>}
        </label>
        {auto && !c.sistema && !invalido && (
          <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
            <Sparkles size={11} /> Autollenado
          </span>
        )}
        {falta && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{invalido ? "Incompleto" : "Falta"}</span>}
      </div>
      {c.ayuda && <p className="-mt-1 mb-1.5 text-xs text-gray-500">{c.ayuda}</p>}
      {control}
    </div>
  );
}
