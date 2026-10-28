"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, CloudCheck, Pencil, ShieldCheck } from "lucide-react";
import type { IdConvocatoria } from "@/lib/config";
import { useConvocatorias } from "@/lib/convocatoria";
import { Campo } from "./Campo";
import { generarPdfRegistro } from "@/lib/pdf/registro";
import { generarBytesFormato, pdfDataUrl } from "@/lib/pdf/cliente";
import { formatoPorClave } from "@/lib/formatos";
import {
  CURPS_REGISTRADAS,
  SECCIONES,
  VALORES_FIJOS,
  esVisible,
  validarSeccion,
  type Respuestas,
} from "@/lib/registro-form";

/**
 * Formulario de registro por pasos (CU-ADM-01).
 * - Una sección por paso + paso final de revisión.
 * - Guardado automático en el navegador para no perder avance (idea de RNF-13).
 * - Cuando exista el backend: el envío hace POST /aspirantes y el guardado
 *   automático puede ir contra un borrador en el servidor.
 */

const STORAGE_KEY = "sigap-registro-borrador";
const TOTAL = SECCIONES.length + 1; // + revisión

type Borrador = { respuestas: Respuestas; paso: number; completados: number[] };

function leerBorrador(): Borrador | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Borrador) : null;
  } catch {
    return null;
  }
}

export function RegistroWizard({ convocatoria }: { convocatoria?: IdConvocatoria }) {
  const router = useRouter();
  // Solo se puede elegir el semestre de una convocatoria abierta (A: enero–junio, B: agosto–diciembre)
  const { activas } = useConvocatorias();
  const semestresAbiertos = activas.map((c) => c.semestre);
  const semestreElegido = activas.find((c) => c.id === convocatoria)?.semestre ?? (activas.length === 1 ? activas[0].semestre : undefined);
  const [respuestas, setRespuestas] = useState<Respuestas>(VALORES_FIJOS);
  const [paso, setPaso] = useState(0);
  const [completados, setCompletados] = useState<number[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [duplicado, setDuplicado] = useState(false);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [errorPrivacidad, setErrorPrivacidad] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);

  // Recuperar borrador al abrir la página (solo en el navegador)
  useEffect(() => {
    const b = leerBorrador();
    if (b) {
      setRespuestas({ ...b.respuestas, ...VALORES_FIJOS });
      setPaso(Math.min(b.paso, TOTAL - 1));
      setCompletados(b.completados.filter((n) => n < SECCIONES.length));
    }
    setCargado(true);
  }, []);

  // Semestre preseleccionado según la convocatoria elegida en el inicio; se descarta si ya no está abierta
  useEffect(() => {
    if (!cargado) return;
    setRespuestas((r) => {
      const actual = String(r.semestre ?? "");
      if (semestreElegido && (convocatoria || !semestresAbiertos.includes(actual))) {
        return actual === semestreElegido ? r : { ...r, semestre: semestreElegido };
      }
      if (actual && !semestresAbiertos.includes(actual)) return { ...r, semestre: "" };
      return r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cargar o si cambian las convocatorias abiertas
  }, [cargado, semestreElegido, semestresAbiertos.join("|")]);

  // Guardado automático
  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ respuestas, paso, completados }));
        setGuardadoEn(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      } catch {
        /* sin almacenamiento disponible: el formulario sigue funcionando */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [respuestas, paso, completados, cargado]);

  const irA = (n: number) => {
    setPaso(n);
    setErrores({});
    setDuplicado(false);
    tarjetaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cambiar = (id: string, valor: string | string[]) => {
    setRespuestas((r) => ({ ...r, [id]: valor }));
    setErrores((e) => {
      if (!e[id]) return e;
      const { [id]: _omit, ...resto } = e;
      void _omit;
      return resto;
    });
    if (id === "curp") setDuplicado(false);
  };

  const siguiente = () => {
    const seccion = SECCIONES[paso];
    const errs = validarSeccion(seccion, respuestas);
    setErrores(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    if (seccion.id === "personales" && CURPS_REGISTRADAS.includes(String(respuestas.curp))) {
      setDuplicado(true);
      return;
    }
    setCompletados((c) => (c.includes(paso) ? c : [...c, paso]));
    irA(paso + 1);
  };

  const enviar = async () => {
    if (enviando) return;
    // Verifica todas las secciones antes de enviar
    const pendiente = SECCIONES.findIndex((s) => Object.keys(validarSeccion(s, respuestas)).length > 0);
    if (pendiente !== -1) {
      irA(pendiente);
      setErrores(validarSeccion(SECCIONES[pendiente], respuestas));
      return;
    }
    if (!aceptaPrivacidad) {
      setErrorPrivacidad(true);
      return;
    }
    // CASCARÓN: el ID lo generará el backend (RF-02)
    const ciclo = String(respuestas.semestre).split(" ")[0];
    const id = `MTC-${ciclo}${String(Math.floor(Math.random() * 900) + 100)}`;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const respuestasEnvio = Object.fromEntries(SECCIONES.flatMap((s) => s.preguntas).filter((p) => esVisible(p, respuestas)).map((p) => [p.id, respuestas[p.id] ?? p.valorFijo ?? ""]));
      const pdf = await generarPdfRegistro(respuestasEnvio, id);
      const sip02 = await generarBytesFormato(formatoPorClave("sip-02")!, { r: respuestasEnvio, c: {}, hoy: new Date() });
      const borrador = { nombre: `SIP-02_${id}.pdf`, bytes: sip02.length, fecha: new Date().toISOString(), dataUrl: await pdfDataUrl(sip02) };
      localStorage.setItem("sigap-registro-pdf", JSON.stringify({ folio: id, pdf }));
      localStorage.removeItem(STORAGE_KEY);
      // Las respuestas alimentan los formatos del expediente (SIP-02 y SIP-04)
      localStorage.setItem("sigap-aspirante-registro", JSON.stringify(respuestasEnvio));
      localStorage.setItem("sigap-expediente", JSON.stringify({ borradores: { "sip-02": borrador } }));
    } catch {
      setErrorEnvio("No se pudo generar o guardar el PDF. Reintenta; si el almacenamiento está lleno, libera espacio del navegador.");
      setEnviando(false);
      return;
    }
    router.push(`/registro/exito?id=${id}&correo=${encodeURIComponent(String(respuestas.correo ?? ""))}`);
  };

  const esRevision = paso === SECCIONES.length;
  const seccion = SECCIONES[paso];
  const progreso = Math.round((completados.length / SECCIONES.length) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* Pasos */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Paso {paso + 1} de {TOTAL}
            </span>
            <span>{progreso}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
          </div>

          <ol className="mt-4 hidden space-y-0.5 lg:block">
            {[...SECCIONES.map((s) => s.titulo), "Revisión y envío"].map((titulo, i) => {
              const hecho = completados.includes(i);
              const actual = i === paso;
              // Se puede saltar a pasos ya completados o al siguiente disponible
              const habilitado = hecho || i <= Math.max(0, ...completados.map((c) => c + 1));
              return (
                <li key={titulo}>
                  <button
                    type="button"
                    disabled={!habilitado}
                    onClick={() => irA(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      actual
                        ? "bg-indigo-50 font-medium text-primary"
                        : habilitado
                          ? "text-gray-700 hover:bg-gray-50"
                          : "cursor-not-allowed text-gray-400"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                        hecho
                          ? "bg-emerald-600 text-white"
                          : actual
                            ? "bg-primary text-white"
                            : "border border-gray-300 text-gray-500"
                      }`}
                    >
                      {hecho ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="leading-tight">{titulo}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {guardadoEn && (
            <p className="mt-4 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
              <CloudCheck size={14} className="text-emerald-600" /> Guardado automático · {guardadoEn}
            </p>
          )}
        </div>
      </aside>

      {/* Contenido del paso */}
      <div ref={tarjetaRef} className="scroll-mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        {!esRevision ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-guinda">Sección {paso + 1}</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">{seccion.titulo}</h2>
            {seccion.descripcion && <p className="mt-1 text-sm text-gray-500">{seccion.descripcion}</p>}

            {duplicado && (
              <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Posible registro duplicado</p>
                  <p className="mt-0.5 text-amber-900/80">
                    Encontramos una solicitud asociada a esta CURP. Verifica tus datos o{" "}
                    <Link href="/login" className="font-medium underline">
                      inicia sesión con tu ID temporal
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}

            {seccion.grupos ? (
              <div className="mt-6 space-y-3">
                {seccion.grupos.map((grupo) => {
                  const visibles = grupo.preguntas.filter((p) => esVisible(p, respuestas));
                  const tieneErrores = visibles.some((p) => errores[p.id]);
                  const tieneDatos = visibles.some((p) => {
                    const valor = respuestas[p.id];
                    return Array.isArray(valor) ? valor.length > 0 : !!valor && valor !== "0" && valor !== "No";
                  });
                  return (
                    <details key={`${grupo.id}-${tieneErrores}`} open={tieneErrores || undefined} className="group rounded-xl border border-gray-200 bg-white open:border-primary/30">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-4 text-sm font-medium text-gray-900">
                        <span>{grupo.titulo}</span>
                        <span className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${tieneErrores ? "bg-red-50 text-red-700" : tieneDatos ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {tieneErrores ? "Revisar" : tieneDatos ? "Con información" : "Opcional"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="border-t border-gray-100 px-4 pb-5 pt-4">
                        {grupo.descripcion && <p className="mb-4 text-sm text-gray-500">{grupo.descripcion}</p>}
                        <div className="grid gap-5 sm:grid-cols-2">
                          {visibles.map((p) => <Campo key={p.id} pregunta={p} valor={respuestas[p.id]} error={errores[p.id]} onChange={(v) => cambiar(p.id, v)} />)}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {seccion.preguntas
                .filter((p) => esVisible(p, respuestas))
                .map((p) => (
                  <Campo
                    key={p.id}
                    pregunta={p.id === "semestre" ? { ...p, opciones: semestresAbiertos } : p}
                    valor={respuestas[p.id]}
                    error={errores[p.id]}
                    onChange={(v) => cambiar(p.id, v)}
                  />
                ))}
            </div>}

            {Object.keys(errores).length > 0 && (
              <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Revisa los campos marcados antes de continuar.
              </p>
            )}
          </>
        ) : (
          <Revision
            respuestas={respuestas}
            onEditar={irA}
            acepta={aceptaPrivacidad}
            errorAcepta={errorPrivacidad}
            onAcepta={(v) => {
              setAceptaPrivacidad(v);
              setErrorPrivacidad(false);
            }}
          />
        )}

        {/* Navegación */}
        {errorEnvio && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorEnvio}</p>}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          {paso > 0 ? (
            <button
              type="button"
              onClick={() => irA(paso - 1)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
          ) : (
            <span />
          )}
          {esRevision ? (
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {enviando ? "Enviando registro…" : "Enviar registro"} <Check size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={siguiente}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {paso === 0 ? "Validar y continuar" : "Siguiente"} <ArrowRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

/** Paso final: resumen de respuestas y aviso de privacidad. */
function Revision({
  respuestas,
  onEditar,
  acepta,
  errorAcepta,
  onAcepta,
}: {
  respuestas: Respuestas;
  onEditar: (paso: number) => void;
  acepta: boolean;
  errorAcepta: boolean;
  onAcepta: (v: boolean) => void;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-guinda">Último paso</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-900">Revisión y envío</h2>
      <p className="mt-1 text-sm text-gray-500">
        Verifica tu información. Después de enviar no podrás modificarla desde aquí.
      </p>

      <div className="mt-6 space-y-4">
        {SECCIONES.map((s, i) => (
          <details key={s.id} className="group rounded-lg border border-gray-200" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-gray-900">
              {s.titulo}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onEditar(i);
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Pencil size={13} /> Editar
              </button>
            </summary>
            <dl className="divide-y divide-gray-100 border-t border-gray-100 px-4 text-sm">
              {s.preguntas
                .filter((p) => esVisible(p, respuestas))
                .map((p) => {
                  const v = respuestas[p.id];
                  const texto = Array.isArray(v) ? (p.ordenable ? v.map((area, indice) => `${indice + 1}. ${area}`).join("\n") : v.join(", ")) : v;
                  return (
                    <div key={p.id} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_1.2fr] sm:gap-4">
                      <dt className="text-gray-500">{p.grupo ? `${p.grupo}: ${p.label}` : p.label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-gray-900">{texto || "—"}</dd>
                    </div>
                  );
                })}
            </dl>
          </details>
        ))}
      </div>

      <label
        className={`mt-6 flex cursor-pointer gap-3 rounded-lg border p-4 text-sm ${
          errorAcepta ? "border-red-300 bg-red-50" : "border-gray-200 bg-indigo-50/50"
        }`}
      >
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => onAcepta(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
        />
        <span className="text-gray-700">
          <span className="flex items-center gap-1.5 font-medium text-gray-900">
            <ShieldCheck size={15} className="text-primary" /> Datos protegidos
          </span>
          Acepto que la información se utilice exclusivamente para el proceso de admisión, conforme al aviso de
          privacidad del IPN.
        </span>
      </label>
      {errorAcepta && <p className="mt-1 text-xs text-red-600">Debes aceptar para enviar tu registro.</p>}
    </>
  );
}
