"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, EyeOff, Maximize, Send, ShieldCheck } from "lucide-react";
import { Aviso, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { useExpediente } from "@/components/expediente/ExpedienteProvider";
import { useAspiranteActivo } from "@/lib/aspirante-activo";
import { nombreCompleto } from "@/lib/aspirante-datos";
import {
  estadoVentana,
  iniciarIntento,
  registrarIncidente,
  responder,
  terminarIntento,
  useExamen,
  type ConfigExamen,
  type Incidente,
  type Intento,
  type Pregunta,
  type Respuesta,
} from "@/lib/examen";
import { MINIMA_AREA, nombreArea } from "@/lib/posgrado/datos";
import { Contenido } from "./Contenido";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const contestada = (r: Respuesta, p?: Pregunta) =>
  r !== undefined && r !== "" && (p?.tipo !== "relacionar" || Object.values(r as Record<string, string>).filter(Boolean).length >= (p.pares?.length ?? 0));

/** El aspirante presenta el examen en línea (con las restricciones que configuró Posgrado). */
export function PresentarExamen() {
  const id = useAspiranteActivo();
  const { registro } = useExpediente();
  const { habilitados, intentos, config, banco, cargado } = useExamen();
  const h = habilitados[id];
  const intento = intentos[id];
  const nombre = nombreCompleto(registro) || "Aspirante";
  if (!cargado) return null;
  if (!h)
    return (
      <Marco>
        <Aviso tono="info" titulo="No tienes un examen habilitado">
          El Departamento de Posgrado te avisará cuando puedas presentarlo.
        </Aviso>
      </Marco>
    );
  if (intento?.terminadoEl) return <Final intento={intento} config={config} />;
  if (!intento) return <Instrucciones config={config} areas={h.areas.filter((a) => config.areasEnLinea.includes(a))} banco={banco} id={id} />;
  return <Examen intento={intento} config={config} banco={banco} id={id} nombre={nombre} />;
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <Link href="/aspirante/evaluacion" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} /> Volver a Evaluación
      </Link>
      {children}
    </div>
  );
}

function Instrucciones({ config, areas, banco, id }: { config: ConfigExamen; areas: Intento["areas"]; banco: Pregunta[]; id: string }) {
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState("");
  const ventana = estadoVentana(config);
  const r = config.restricciones;
  const total = areas.reduce((s, a) => s + config.reglas[a].reduce((t, x) => t + Math.min(x.cantidad, banco.filter((p) => p.activa && p.area === a && p.tema === x.tema).length), 0), 0);
  const iniciar = async () => {
    setError("");
    try {
      if (r.pantallaCompleta) await document.documentElement.requestFullscreen?.().catch(() => undefined);
      iniciarIntento(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el examen.");
    }
  };
  return (
    <Marco>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">{config.titulo}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {areas.map(nombreArea).join(" y ")} · {total} preguntas · {config.duracionMin} minutos · un solo intento
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>El tiempo empieza a correr al iniciar y no se detiene aunque cierres la página. Al terminar el tiempo, el examen se entrega solo.</li>
          <li>Tus respuestas se guardan en cuanto las eliges; puedes cambiarlas mientras no entregues.</li>
          <li>Cada aspirante tiene preguntas y opciones en distinto orden.</li>
          {r.pantallaCompleta && <li>El examen se presenta en pantalla completa. Si sales, se registra.</li>}
          {r.ocultarAlSalir && <li>Si cambias de ventana o pestaña, las preguntas se ocultan y queda registrado.</li>}
          {r.anticopia && <li>No se puede copiar, pegar ni imprimir el contenido del examen.</li>}
          {r.marcaAgua && <li>Tu ID aparece como marca de agua sobre las preguntas.</li>}
          <li>Todos los intentos de copiar, salir de la ventana o hacer capturas quedan registrados para el Departamento de Posgrado.</li>
        </ul>
        {ventana !== "abierta" ? (
          <p className="mt-5 text-sm font-medium text-red-700">
            {ventana === "antes" ? `El examen abre el ${new Date(config.inicio).toLocaleString("es-MX")}.` : "El periodo para presentar el examen terminó."}
          </p>
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

function Final({ intento, config }: { intento: Intento; config: ConfigExamen }) {
  useEffect(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);
  return (
    <Marco>
      <section className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Examen entregado</h1>
        <p className="mt-1 text-sm text-gray-600">{new Date(intento.terminadoEl!).toLocaleString("es-MX")}</p>
        {config.mostrarCalificacion && intento.calificaciones ? (
          <ul className="mx-auto mt-4 max-w-xs space-y-1 text-sm">
            {intento.areas.map((a) => (
              <li key={a} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span>{nombreArea(a)}</span>
                <strong className={(intento.calificaciones?.[a] ?? 0) >= MINIMA_AREA ? "text-emerald-700" : "text-red-700"}>{intento.calificaciones?.[a]?.toFixed(1)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-700">El Departamento de Posgrado publicará tu resultado en la fase de Resultados.</p>
        )}
      </section>
    </Marco>
  );
}

function Examen({ intento, config, banco, id, nombre }: { intento: Intento; config: ConfigExamen; banco: Pregunta[]; id: string; nombre: string }) {
  const r = config.restricciones;
  const preguntas = useMemo(() => intento.preguntas.map((x) => ({ ...x, p: banco.find((b) => b.id === x.id) })).filter((x) => x.p), [intento.preguntas, banco]);
  const [actual, setActual] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());
  const [oculto, setOculto] = useState<"" | "ventana" | "pantalla">("");
  const [confirmar, setConfirmar] = useState(false);
  const ocultoRef = useRef(oculto);
  useEffect(() => {
    ocultoRef.current = oculto;
  }, [oculto]);
  const restante = new Date(intento.limiteEl).getTime() - ahora;

  const incidente = useCallback((t: Incidente["tipo"]) => registrarIncidente(id, t), [id]);

  // Cronómetro: al acabarse el tiempo se entrega solo
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (restante <= 0) terminarIntento(id);
  }, [restante, id]);

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
  const sinContestar = preguntas.filter((x) => !contestada(intento.respuestas[x.id], x.p)).length;
  const visibles = r.unaPorPantalla ? [preguntas[actual]].filter(Boolean) : preguntas;
  const marca = `${id} · ${nombre}`;

  return (
    <div className={`examen-protegido relative mx-auto max-w-3xl pb-10 ${r.anticopia ? "select-none" : ""}`} {...bloquear}>
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{config.titulo}</p>
          <p className="text-xs text-gray-500">
            {preguntas.length - sinContestar} de {preguntas.length} contestadas
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold ${restante < 5 * 60_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-800"}`}>
          <Clock size={14} /> {mmss(restante)}
        </span>
        <button type="button" onClick={() => setConfirmar(true)} className={botonPrimario}>
          <Send size={15} /> Entregar
        </button>
      </header>

      {r.unaPorPantalla && (
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Preguntas">
          {preguntas.map((x, k) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setActual(k)}
              className={`h-8 w-8 rounded-md text-xs font-medium ${k === actual ? "bg-primary text-white" : contestada(intento.respuestas[x.id], x.p) ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
            <section key={x.id} className="relative mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Pregunta {k + 1} de {preguntas.length} · {nombreArea(x.area)}
              </p>
              <Contenido html={x.p!.enunciado} className="text-[15px] leading-relaxed text-gray-900" />
              <div className="mt-4">
                <Respuestas p={x.p!} orden={x.orden} valor={intento.respuestas[x.id]} onCambio={(v) => responder(id, x.id, v)} />
              </div>
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
          <button type="button" disabled={actual === 0} onClick={() => setActual(actual - 1)} className={botonSecundario}>
            <ArrowLeft size={15} /> Anterior
          </button>
          {actual < preguntas.length - 1 ? (
            <button type="button" onClick={() => setActual(actual + 1)} className={botonSecundario}>
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
            <p className="font-semibold text-gray-900">¿Entregar el examen?</p>
            {sinContestar > 0 && (
              <p className="mt-2 flex items-start gap-2 text-sm text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Tienes {sinContestar} pregunta(s) sin contestar.
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">Después de entregarlo ya no podrás cambiar tus respuestas.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={botonSecundario} onClick={() => setConfirmar(false)}>
                Seguir contestando
              </button>
              <button type="button" className={botonPrimario} onClick={() => terminarIntento(id)}>
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

function Respuestas({ p, orden, valor, onCambio }: { p: Pregunta; orden: string[]; valor: Respuesta; onCambio: (v: Respuesta) => void }) {
  if (p.tipo === "opcion") {
    const ops = (orden.length ? orden : (p.opciones ?? []).map((o) => o.id)).map((oid) => p.opciones?.find((o) => o.id === oid)).filter(Boolean);
    return (
      <ul className="space-y-2">
        {ops.map((o, k) => (
          <li key={o!.id}>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${valor === o!.id ? "border-primary bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <input type="radio" name={p.id} checked={valor === o!.id} onChange={() => onCambio(o!.id)} className="mt-1" />
              <span className="font-medium text-gray-500">{String.fromCharCode(97 + k)})</span>
              <Contenido html={o!.texto} como="span" className="text-gray-900" />
            </label>
          </li>
        ))}
      </ul>
    );
  }
  if (p.tipo === "vf")
    return (
      <div className="flex gap-3">
        {[true, false].map((v) => (
          <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${valor === v ? "border-primary bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
            <input type="radio" name={p.id} checked={valor === v} onChange={() => onCambio(v)} /> {v ? "Verdadero" : "Falso"}
          </label>
        ))}
      </div>
    );
  if (p.tipo === "corta")
    return (
      <input
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => onCambio(e.target.value)}
        className={`${inputBase} max-w-sm`}
        placeholder="Escribe tu respuesta"
        autoComplete="off"
        spellCheck={false}
      />
    );
  // Relacionar: a cada concepto (izquierda) se le elige su descripción
  const pares = (orden.length ? orden : (p.pares ?? []).map((x) => x.id)).map((pid) => p.pares?.find((x) => x.id === pid)).filter(Boolean);
  const derechas = [...(p.pares ?? [])].sort((a, b) => a.derecha.localeCompare(b.derecha, "es"));
  const v = (typeof valor === "object" ? valor : {}) as Record<string, string>;
  return (
    <div className="space-y-2">
      {pares.map((x) => (
        <div key={x!.id} className="grid gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:grid-cols-2 sm:items-center">
          <Contenido html={x!.izquierda} className="text-sm text-gray-900" />
          <select value={v[x!.id] ?? ""} onChange={(e) => onCambio({ ...v, [x!.id]: e.target.value })} className={`${inputBase} py-1.5`} aria-label="Elige la que corresponde">
            <option value="">Elige…</option>
            {derechas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.derecha}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
