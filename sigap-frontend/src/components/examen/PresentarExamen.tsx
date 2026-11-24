"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, EyeOff, FileQuestion, Maximize, PlayCircle, Send, ShieldCheck } from "lucide-react";
import { Aviso, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { useExpediente } from "@/components/expediente/ExpedienteProvider";
import { useAspiranteActivo } from "@/lib/aspirante-activo";
import { nombreCompleto } from "@/lib/aspirante-datos";
import type { IdConvocatoria } from "@/lib/config";
import { fechaResultados, useConvocatorias } from "@/lib/convocatoria";
import {
  REMOTO,
  useAspiranteServidor,
  APROBATORIO,
  aprobado,
  areasHabilitadas,
  claveIntento,
  estadoVentana,
  iniciarIntento,
  registrarIncidente,
  responder,
  resumenArea,
  terminarIntento,
  useExamen,
  type ConfigExamen,
  type Incidente,
  type Intento,
  type Pregunta,
} from "@/lib/examen";
import { nombreArea, type AreaEvalId } from "@/lib/posgrado/datos";
import { ResponderPregunta, SIN_ORDEN, estaContestada, nuevoOrden, type Orden } from "./ResponderPregunta";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const fechaHora = (s: string) => new Date(s).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const hora = (s: string) => new Date(s).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const fechaLarga = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/** Causas de suspensión del examen (indicaciones de la Subdirección Académica). */
const CAUSAS_SUSPENSION = [
  "Uso de procedimientos fraudulentos.",
  "Copiar de manera digital.",
  "Comunicación con otros estudiantes o personas.",
  "Suplantación de personalidad.",
  "Alteración del desarrollo normal del examen.",
  "Ofensas o desconsideraciones.",
  "Sustracción digital del examen.",
  "Uso de dispositivos digitales no permitidos.",
];

/** Nombre y convocatoria del aspirante: del servidor o, en la demostración, del expediente del navegador. */
function useDatosLocales() {
  const { registro } = useExpediente();
  return { nombre: nombreCompleto(registro) || "Aspirante", convocatoria: (String(registro.semestre ?? "A").charAt(0) === "B" ? "B" : "A") as IdConvocatoria };
}
function useDatosServidor() {
  const d = useAspiranteServidor();
  return { nombre: d.nombre || "Aspirante", convocatoria: (d.convocatoria ?? "A") as IdConvocatoria };
}
const useDatosAspirante = REMOTO ? useDatosServidor : useDatosLocales;

/** Leyenda con la fecha de publicación de resultados de la convocatoria del aspirante. */
function usePublicacion() {
  const { convocatoria: conv } = useDatosAspirante();
  const { config } = useConvocatorias();
  const f = fechaResultados(config, conv);
  return f ? `La publicación de resultados será el ${fechaLarga(f)}.` : "El Departamento de Posgrado publicará los resultados en la fase de Resultados.";
}

/** El aspirante presenta sus exámenes en línea: uno por área, cada uno en su horario. */
export function PresentarExamen() {
  const idLocal = useAspiranteActivo();
  const { nombre } = useDatosAspirante();
  const estado = useExamen();
  const { intentos, config, banco, cargado } = estado;
  const id = estado.yo ?? idLocal;
  const [elegida, setElegida] = useState<AreaEvalId | null>(null);
  if (!cargado) return null;
  const areas = areasHabilitadas(estado, id);
  if (!areas.length)
    return (
      <Marco>
        <Aviso tono="info" titulo="No tienes un examen habilitado">
          El Departamento de Posgrado te avisará cuando puedas presentarlo.
        </Aviso>
      </Marco>
    );
  // Un examen en curso se retoma directamente (aunque se haya recargado la página)
  const enCurso = areas.map((a) => intentos[claveIntento(id, a)]).find((i) => i && !i.terminadoEl);
  if (enCurso) return <Examen key={enCurso.area} intento={enCurso} config={config} banco={banco} id={id} nombre={nombre} desfase={estado.desfase} onEntregado={setElegida} />;
  if (elegida) {
    const i = intentos[claveIntento(id, elegida)];
    if (i?.terminadoEl) return <Final intento={i} config={config} onVolver={() => setElegida(null)} />;
    return <Instrucciones area={elegida} config={config} banco={banco} id={id} onVolver={() => setElegida(null)} />;
  }
  return <Lista areas={areas} intentos={intentos} config={config} banco={banco} id={id} onElegir={setElegida} />;
}

function Marco({ children, onVolver }: { children: React.ReactNode; onVolver?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      {onVolver ? (
        <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} /> Mis exámenes
        </button>
      ) : (
        <Link href="/aspirante/evaluacion" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} /> Volver a Evaluación
        </Link>
      )}
      {children}
    </div>
  );
}

/** Los exámenes del aspirante (uno por área) con su horario y estado. */
function Lista({ areas, intentos, config, banco, id, onElegir }: { areas: AreaEvalId[]; intentos: Record<string, Intento>; config: ConfigExamen; banco: Pregunta[]; id: string; onElegir: (a: AreaEvalId) => void }) {
  const leyenda = usePublicacion();
  return (
    <Marco>
      <h1 className="text-xl font-semibold text-gray-900">{config.titulo}</h1>
      <p className="text-sm text-gray-600">Cada área es un examen aparte, con su propio horario. Solo puedes presentar un examen a la vez y cada uno una sola vez.</p>
      {areas.map((a) => {
        const ca = config.areas[a];
        const i = intentos[claveIntento(id, a)];
        const v = estadoVentana(ca);
        const { preguntas } = resumenArea(config, a, REMOTO ? undefined : banco);
        return (
          <section key={a} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="flex items-center gap-2 font-semibold text-gray-900">
              <FileQuestion size={17} className="text-primary" /> Examen de {nombreArea(a)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
              <CalendarDays size={14} /> {fechaHora(ca.inicio)} a {hora(ca.fin)}
            </p>
            <p className="text-sm text-gray-600">
              {preguntas} preguntas · {ca.duracionMin} minutos · vale {ca.valor} puntos
            </p>
            {i?.terminadoEl ? (
              <div className="mt-3">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 size={16} /> Entregado: {fechaHora(i.terminadoEl)}
                </p>
                <p className="mt-1 text-sm text-gray-700">{leyenda}</p>
              </div>
            ) : v === "antes" ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <Clock size={15} /> Podrás iniciarlo a partir del {fechaHora(ca.inicio)}.
              </p>
            ) : v === "cerrada" ? (
              <p className="mt-3 text-sm text-red-700">El periodo para presentar este examen terminó.</p>
            ) : (
              <button type="button" onClick={() => onElegir(a)} className={`${botonPrimario} mt-3`}>
                <PlayCircle size={16} /> Presentar examen de {nombreArea(a)}
              </button>
            )}
          </section>
        );
      })}
    </Marco>
  );
}

function Instrucciones({ area, config, banco, id, onVolver }: { area: AreaEvalId; config: ConfigExamen; banco: Pregunta[]; id: string; onVolver: () => void }) {
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState("");
  const ca = config.areas[area];
  const ventana = estadoVentana(ca);
  const r = config.restricciones;
  const { preguntas } = resumenArea(config, area, REMOTO ? undefined : banco);
  const iniciar = async () => {
    setError("");
    try {
      if (r.pantallaCompleta) await document.documentElement.requestFullscreen?.().catch(() => undefined);
      await iniciarIntento(id, area);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el examen.");
    }
  };
  return (
    <Marco onVolver={onVolver}>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Examen de {nombreArea(area)}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {config.titulo} · {preguntas} preguntas · {ca.duracionMin} minutos · un solo intento
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>El tiempo empieza a correr al iniciar y no se detiene aunque cierres la página. Al terminar el tiempo, el examen se entrega solo.</li>
          <li>Tus respuestas se guardan en cuanto las eliges; puedes cambiarlas mientras no entregues.</li>
          <li>
            No todas las preguntas valen lo mismo: cada una indica cuántos puntos vale. El examen vale {ca.valor} puntos y se aprueba con {Math.round(APROBATORIO * ca.valor * 10) / 10}.
          </li>
          <li>Arriba verás qué preguntas te faltan por responder.</li>
          {r.pantallaCompleta && <li>El examen se presenta en pantalla completa. Si sales, se registra.</li>}
          {r.ocultarAlSalir && <li>Si cambias de ventana o pestaña, las preguntas se ocultan y queda registrado.</li>}
          {r.anticopia && <li>No se puede copiar, pegar ni imprimir el contenido del examen.</li>}
          {r.marcaAgua && <li>Tu ID aparece como marca de agua sobre las preguntas.</li>}
          <li>Todos los intentos de copiar, salir de la ventana o hacer capturas quedan registrados para el Departamento de Posgrado.</li>
        </ul>
        <p className="mt-4 text-sm font-semibold text-gray-900">Ponderación: 100 %.</p>
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-gray-800">
          <p className="font-semibold text-red-800">Se suspenderá el examen si se presentan los siguientes casos:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {CAUSAS_SUSPENSION.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        {ventana !== "abierta" ? (
          <p className="mt-5 text-sm font-medium text-red-700">{ventana === "antes" ? `El examen abre el ${fechaHora(ca.inicio)}.` : "El periodo para presentar el examen terminó."}</p>
        ) : (
          <>
            <label className="mt-5 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-1" />
              <span>Leí las indicaciones y presentaré el examen por mí mismo(a), sin ayuda ni materiales no autorizados.</span>
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button type="button" disabled={!acepto} onClick={iniciar} className={`${botonPrimario} mt-4`}>
              <ShieldCheck size={16} /> Iniciar examen
            </button>
          </>
        )}
      </section>
    </Marco>
  );
}

function Final({ intento, config, onVolver }: { intento: Intento; config: ConfigExamen; onVolver: () => void }) {
  const leyenda = usePublicacion();
  useEffect(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);
  return (
    <Marco onVolver={onVolver}>
      <section className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Examen de {nombreArea(intento.area)} entregado</h1>
        <p className="mt-1 text-sm text-gray-600">{new Date(intento.terminadoEl!).toLocaleString("es-MX")}</p>
        {config.mostrarCalificacion && intento.calificacion !== undefined && (
          <p className={`mx-auto mt-4 max-w-xs rounded-lg bg-gray-50 px-3 py-2 text-sm ${aprobado(intento) ? "text-emerald-700" : "text-red-700"}`}>
            Calificación: <strong>{intento.calificacion.toFixed(1)}</strong> de {intento.valorExamen} ({intento.puntos} de {intento.puntosMax} puntos)
          </p>
        )}
        <p className="mt-4 text-base font-medium text-gray-900">{leyenda}</p>
      </section>
    </Marco>
  );
}

function Examen({
  intento,
  config,
  banco,
  id,
  nombre,
  desfase,
  onEntregado,
}: {
  intento: Intento;
  config: ConfigExamen;
  banco: Pregunta[];
  id: string;
  nombre: string;
  /** Diferencia entre el reloj del servidor y el de esta computadora */
  desfase: number;
  onEntregado: (a: AreaEvalId) => void;
}) {
  const r = config.restricciones;
  const area = intento.area;
  const preguntas = useMemo(() => intento.preguntas.map((x) => ({ ...x, p: banco.find((b) => b.id === x.id) })).filter((x) => x.p), [intento.preguntas, banco]);
  const [actual, setActual] = useState(0);
  // Las opciones se revuelven cada vez que entra a una pregunta (en una sola página, al abrir el examen)
  const [ordenes, setOrdenes] = useState<Record<string, Orden>>(() =>
    Object.fromEntries((r.unaPorPantalla ? preguntas.slice(0, 1) : preguntas).map((x) => [x.id, nuevoOrden(x.p, x)])),
  );
  const [ahora, setAhora] = useState(() => Date.now());
  const [oculto, setOculto] = useState<"" | "ventana" | "pantalla">("");
  const [confirmar, setConfirmar] = useState(false);
  const ocultoRef = useRef(oculto);
  useEffect(() => {
    ocultoRef.current = oculto;
  }, [oculto]);
  const restante = new Date(intento.limiteEl).getTime() - (ahora + desfase);
  const [errorEntrega, setErrorEntrega] = useState("");

  const incidente = useCallback((t: Incidente["tipo"]) => registrarIncidente(id, area, t), [id, area]);
  const ir = (k: number) => {
    setConfirmar(false);
    if (r.unaPorPantalla) {
      setActual(k);
      setOrdenes((o) => ({ ...o, [preguntas[k].id]: nuevoOrden(preguntas[k].p, preguntas[k]) }));
      window.scrollTo({ top: 0 });
    } else document.getElementById(`pregunta-${k + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Cronómetro: al acabarse el tiempo se entrega solo
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const entregando = useRef(false);
  const entregar = useCallback(async () => {
    if (entregando.current) return;
    entregando.current = true;
    setErrorEntrega("");
    try {
      await terminarIntento(id, area);
      onEntregado(area);
    } catch (e) {
      setErrorEntrega(e instanceof Error ? e.message : "No se pudo entregar; revisa tu conexión e inténtalo de nuevo.");
    } finally {
      entregando.current = false;
    }
  }, [id, area, onEntregado]);
  // Al acabarse el tiempo se entrega solo (el servidor también lo cierra por su cuenta)
  useEffect(() => {
    const ms = new Date(intento.limiteEl).getTime() - (Date.now() + desfase);
    const t = setTimeout(() => void entregar(), Math.max(0, Math.min(ms, 2_000_000_000)));
    return () => clearTimeout(t);
  }, [intento.limiteEl, desfase, entregar]);

  // Restricciones: salir de la ventana, pantalla completa, copiar, imprimir, capturas
  useEffect(() => {
    const salir = () => {
      if (!r.ocultarAlSalir || ocultoRef.current) return;
      setOculto("ventana");
      incidente("salio-ventana");
    };
    const visibilidad = () => document.visibilityState === "hidden" && salir();
    const pantalla = () => {
      if (r.pantallaCompleta && !document.fullscreenElement) {
        setOculto("pantalla");
        incidente("salio-pantalla-completa");
      }
    };
    const teclas = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!r.anticopia || !(e.ctrlKey || e.metaKey)) return;
      if (["c", "x", "v", "a", "u", "s"].includes(k)) {
        e.preventDefault();
        if (k !== "a") incidente("copiar");
      }
      if (k === "p") {
        e.preventDefault();
        incidente("imprimir");
      }
      // Captura en Mac (Cmd+Shift+3/4/5); Win+Shift+S de Windows no se puede interceptar
      if (e.shiftKey && ["3", "4", "5"].includes(k)) incidente("captura");
    };
    // La tecla Impr Pant solo avisa al soltarse: se registra, se ocultan las preguntas y se vacía el portapapeles
    const captura = (e: KeyboardEvent) => {
      if (e.key !== "PrintScreen") return;
      incidente("captura");
      if (r.ocultarAlSalir) setOculto("ventana");
      void navigator.clipboard?.writeText("").catch(() => undefined);
    };
    const imprimir = () => incidente("imprimir");
    window.addEventListener("blur", salir);
    document.addEventListener("visibilitychange", visibilidad);
    document.addEventListener("fullscreenchange", pantalla);
    window.addEventListener("keydown", teclas, true);
    window.addEventListener("keyup", captura);
    window.addEventListener("beforeprint", imprimir);
    return () => {
      window.removeEventListener("blur", salir);
      document.removeEventListener("visibilitychange", visibilidad);
      document.removeEventListener("fullscreenchange", pantalla);
      window.removeEventListener("keydown", teclas, true);
      window.removeEventListener("keyup", captura);
      window.removeEventListener("beforeprint", imprimir);
    };
  }, [r.ocultarAlSalir, r.pantallaCompleta, r.anticopia, incidente]);

  const bloquear = r.anticopia
    ? {
        onCopy: (e: React.ClipboardEvent) => {
          e.preventDefault();
          incidente("copiar");
        },
        onCut: (e: React.ClipboardEvent) => {
          e.preventDefault();
          incidente("copiar");
        },
        onPaste: (e: React.ClipboardEvent) => {
          e.preventDefault();
          incidente("copiar");
        },
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          incidente("clic-derecho");
        },
        onDragStart: (e: React.DragEvent) => e.preventDefault(),
      }
    : {};
  const volver = async () => {
    if (r.pantallaCompleta && !document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => undefined);
    setOculto("");
  };
  const faltan = preguntas.map((x, k) => ({ x, k })).filter(({ x }) => !estaContestada(x.p, intento.respuestas[x.id], x));
  const visibles = r.unaPorPantalla ? [preguntas[actual]].filter(Boolean) : preguntas;
  const marca = `${id} · ${nombre}`;

  return (
    <div className={`examen-protegido relative mx-auto max-w-3xl pb-10 ${r.anticopia ? "select-none" : ""}`} {...bloquear}>
      <header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">Examen de {nombreArea(area)}</p>
            <p className="text-xs text-gray-500">
              {preguntas.length - faltan.length} de {preguntas.length} contestadas
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold ${restante < 5 * 60_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-800"}`}>
            <Clock size={14} /> {mmss(restante)}
          </span>
          <button type="button" onClick={() => setConfirmar(true)} className={botonPrimario}>
            <Send size={15} /> Entregar
          </button>
        </div>
        {faltan.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-amber-800">Te faltan por responder:</span>
            {faltan.map(({ k }) => (
              <button key={k} type="button" onClick={() => ir(k)} className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 hover:bg-amber-200" aria-label={`Ir a la pregunta ${k + 1}`}>
                {k + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} /> Ya respondiste todas las preguntas.
          </p>
        )}
      </header>

      {r.unaPorPantalla && (
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Preguntas">
          {preguntas.map((x, k) => (
            <button
              key={x.id}
              type="button"
              onClick={() => ir(k)}
              className={`h-8 w-8 rounded-md text-xs font-medium ${k === actual ? "bg-primary text-white" : estaContestada(x.p, intento.respuestas[x.id], x) ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"}`}
              aria-label={`Pregunta ${k + 1}`}
            >
              {k + 1}
            </button>
          ))}
        </nav>
      )}

      <div className="relative">
        {visibles.map((x) => {
          const k = preguntas.indexOf(x);
          return (
            <section key={x.id} id={`pregunta-${k + 1}`} className="relative mb-4 scroll-mt-32 overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
              <p className="mb-2 flex flex-wrap justify-between gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                <span>
                  Pregunta {k + 1} de {preguntas.length}
                </span>
                <span className="normal-case">
                  Vale {x.valor} {x.valor === 1 ? "punto" : "puntos"}
                </span>
              </p>
              <ResponderPregunta p={x.p!} item={x} orden={ordenes[x.id] ?? SIN_ORDEN} valor={intento.respuestas[x.id]} onCambio={(v) => responder(id, area, x.id, v)} />
              {r.marcaAgua && <MarcaAgua texto={marca} />}
            </section>
          );
        })}
        {oculto && (
          <div className="absolute inset-0 z-10 flex min-h-[320px] items-start justify-center rounded-xl bg-gray-100/95 pt-16 backdrop-blur-md">
            <div className="max-w-sm rounded-xl border border-amber-200 bg-white p-5 text-center shadow">
              <EyeOff size={28} className="mx-auto text-amber-600" />
              <p className="mt-2 font-semibold text-gray-900">{oculto === "pantalla" ? "Saliste de pantalla completa" : "Saliste de la ventana del examen"}</p>
              <p className="mt-1 text-sm text-gray-600">Quedó registrado para el Departamento de Posgrado. El tiempo sigue corriendo.</p>
              <button type="button" onClick={volver} className={`${botonPrimario} mt-4`}>
                {oculto === "pantalla" ? <Maximize size={15} /> : null} Volver al examen
              </button>
            </div>
          </div>
        )}
      </div>

      {r.unaPorPantalla && (
        <div className="flex justify-between">
          <button type="button" disabled={actual === 0} onClick={() => ir(actual - 1)} className={botonSecundario}>
            <ArrowLeft size={15} /> Anterior
          </button>
          {actual < preguntas.length - 1 ? (
            <button type="button" onClick={() => ir(actual + 1)} className={botonSecundario}>
              Siguiente <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmar(true)} className={botonPrimario}>
              <Send size={15} /> Entregar
            </button>
          )}
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <p className="font-semibold text-gray-900">¿Entregar el examen de {nombreArea(area)}?</p>
            {faltan.length > 0 && (
              <div className="mt-2 text-sm text-amber-800">
                <p className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Te faltan {faltan.length} pregunta(s) por responder:
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5 pl-6">
                  {faltan.map(({ k }) => (
                    <button key={k} type="button" onClick={() => ir(k)} className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200">
                      {k + 1}
                    </button>
                  ))}
                </p>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600">Después de entregarlo ya no podrás cambiar tus respuestas.</p>
            {errorEntrega && <p className="mt-2 text-sm text-red-700">{errorEntrega}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={botonSecundario} onClick={() => setConfirmar(false)}>
                Seguir contestando
              </button>
              <button type="button" className={botonPrimario} onClick={entregar}>
                <Send size={15} /> Entregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Marca de agua repetida con el ID del aspirante (no se puede seleccionar ni quitar con clic). */
function MarcaAgua({ texto }: { texto: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='140'><text x='0' y='90' transform='rotate(-18 160 70)' fill='%231e1b4b' fill-opacity='0.07' font-family='sans-serif' font-size='15'>${texto.replace(/[<>&'"]/g, "")}</text></svg>`;
  return <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${svg}")` }} />;
}
