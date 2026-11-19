"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, FileUp, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Aviso, Etiqueta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { notificar } from "@/lib/avisos-ui";
import { NIVELES, NOMBRE_NIVEL, NOMBRE_TIPO, eliminarPregunta, guardarPregunta, importarPreguntas, nuevoId, restaurarBancoEjemplo, useExamen, type Nivel, type Pregunta, type TipoPregunta } from "@/lib/examen";
import { importarGift, type ResultadoImportacion } from "@/lib/examen-gift";
import { AREAS_EVAL, nombreArea, type AreaEvalId } from "@/lib/posgrado/datos";
import { useSesion } from "@/lib/sesion";
import { Contenido, textoPlano } from "./Contenido";
import { EditorPregunta } from "./EditorPregunta";
import { VistaRespuestas } from "./VistaRespuestas";

const TONO_NIVEL: Record<Nivel, string> = {
  recordar: "bg-gray-100 text-gray-700",
  comprender: "bg-sky-50 text-sky-800",
  aplicar: "bg-emerald-50 text-emerald-700",
  analizar: "bg-violet-50 text-violet-800",
  evaluar: "bg-amber-50 text-amber-800",
  crear: "bg-rose-50 text-rose-800",
  "sin-nivel": "bg-gray-50 text-gray-500",
};

/** Banco de preguntas del examen de admisión: lo consultan y editan Posgrado y la Subdirección Académica. */
export function BancoPreguntas() {
  const { banco, cargado } = useExamen();
  const { registrarEnBitacora } = usePosgrado();
  const { sesion } = useSesion();
  const por = sesion?.nombre ?? "Posgrado";
  const [area, setArea] = useState<AreaEvalId>("matematicas");
  const [tema, setTema] = useState("");
  const [nivel, setNivel] = useState("");
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [verInactivas, setVerInactivas] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<Pregunta | null>(null);
  const [importando, setImportando] = useState(false);

  const delArea = useMemo(() => banco.filter((p) => p.area === area), [banco, area]);
  const temas = useMemo(() => [...new Set(delArea.map((p) => p.tema))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })), [delArea]);
  if (!cargado) return null;

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = delArea.filter(
    (p) =>
      (!tema || p.tema === tema) &&
      (!nivel || p.nivel === nivel) &&
      (!tipo || p.tipo === tipo) &&
      (verInactivas || p.activa) &&
      (!q || norm(`${textoPlano(p.enunciado)} ${p.clave ?? ""}`).includes(norm(q))),
  );
  const nueva = (): Pregunta => ({
    id: nuevoId(),
    area,
    unidad: delArea.find((p) => p.tema === tema)?.unidad ?? "",
    tema: tema || temas[0] || "",
    nivel: "comprender",
    tipo: "opcion",
    enunciado: "",
    opciones: [
      { id: "a", texto: "", correcta: true },
      { id: "b", texto: "", correcta: false },
      { id: "c", texto: "", correcta: false },
      { id: "d", texto: "", correcta: false },
    ],
    activa: true,
    origen: "sigap",
    actualizadoEl: new Date().toISOString(),
    actualizadoPor: por,
  });
  const etiqueta = (p: Pregunta) => p.clave || `${p.tema} · ${textoPlano(p.enunciado).slice(0, 40)}`;
  const guardar = (p: Pregunta, accion: string) => {
    guardarPregunta({ ...p, actualizadoEl: new Date().toISOString(), actualizadoPor: por });
    registrarEnBitacora(`${accion} en el banco del examen (${nombreArea(p.area)}): ${etiqueta(p)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist">
          {AREAS_EVAL.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={area === a.id}
              onClick={() => {
                setArea(a.id);
                setTema("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${area === a.id ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {a.id === "matematicas" ? "Matemáticas" : a.nombre} · {banco.filter((p) => p.area === a.id).length}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSecundario} onClick={() => setImportando(true)}>
            <FileUp size={15} /> Importar de Moodle
          </button>
          <button type="button" className={botonPrimario} onClick={() => setEditando(nueva())}>
            <Plus size={15} /> Nueva pregunta
          </button>
        </div>
      </div>

      <Resumen preguntas={delArea} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="font-medium text-gray-900">Buscar</span>
          <span className="relative mt-1 block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Texto o clave de Moodle" className={`${inputBase} pl-8`} />
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Tema</span>
          <select value={tema} onChange={(e) => setTema(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos ({temas.length})</option>
            {temas.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Nivel</span>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos</option>
            {[...NIVELES, "sin-nivel" as const].map((n) => (
              <option key={n} value={n}>
                {NOMBRE_NIVEL[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos</option>
            {(Object.keys(NOMBRE_TIPO) as TipoPregunta[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={verInactivas} onChange={(e) => setVerInactivas(e.target.checked)} /> Mostrar las desactivadas (no salen en el examen)
      </label>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900">
          {lista.length} pregunta{lista.length === 1 ? "" : "s"}
        </p>
        <ul className="divide-y divide-gray-100">
          {lista.map((p) => {
            const ver = abierta === p.id;
            return (
              <li key={p.id} className={p.activa ? "" : "bg-gray-50/80"}>
                <button type="button" onClick={() => setAbierta(ver ? null : p.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50">
                  {ver ? <ChevronDown size={16} className="mt-0.5 shrink-0 text-gray-400" /> : <ChevronRight size={16} className="mt-0.5 shrink-0 text-gray-400" />}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${p.activa ? "text-gray-900" : "text-gray-500 line-through"}`}>{textoPlano(p.enunciado) || "(sin enunciado)"}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      <span>{p.tema}</span>·<span>{NOMBRE_TIPO[p.tipo]}</span>
                      <Etiqueta tono={TONO_NIVEL[p.nivel]}>{NOMBRE_NIVEL[p.nivel]}</Etiqueta>
                      {p.clave && <span className="font-mono">{p.clave}</span>}
                      {!p.activa && <Etiqueta tono="bg-gray-200 text-gray-600">Desactivada</Etiqueta>}
                    </span>
                  </span>
                </button>
                {ver && (
                  <div className="space-y-3 border-t border-gray-100 bg-gray-50/50 px-4 py-4 pl-11">
                    <Contenido html={p.enunciado} className="text-sm text-gray-900" />
                    <VistaRespuestas p={p} />
                    {p.retroalimentacion && (
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">Retroalimentación: </span>
                        <Contenido html={p.retroalimentacion} como="span" />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {p.unidad} · {p.origen === "moodle" ? "Importada de Moodle" : "Creada en SIGAP"} · Último cambio: {p.actualizadoPor},{" "}
                      {new Date(p.actualizadoEl).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={botonSecundario} onClick={() => setEditando(p)}>
                        <Pencil size={14} /> Editar
                      </button>
                      <button type="button" className={botonSecundario} onClick={() => setEditando({ ...p, id: nuevoId(), clave: undefined, origen: "sigap" })}>
                        <Copy size={14} /> Duplicar
                      </button>
                      <button type="button" className={botonSecundario} onClick={() => guardar({ ...p, activa: !p.activa }, p.activa ? "Desactivó una pregunta" : "Activó una pregunta")}>
                        {p.activa ? <EyeOff size={14} /> : <Eye size={14} />} {p.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (!window.confirm("¿Eliminar esta pregunta del banco? No se puede deshacer (si solo quieres que no salga, desactívala).")) return;
                          eliminarPregunta(p.id);
                          registrarEnBitacora(`Eliminó una pregunta del banco del examen (${nombreArea(p.area)}): ${etiqueta(p)}`);
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!lista.length && <li className="px-4 py-8 text-center text-sm text-gray-500">No hay preguntas con esos filtros.</li>}
        </ul>
      </section>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
        onClick={() => {
          if (window.confirm("¿Volver al banco de ejemplo? Se borran las preguntas importadas y los cambios de este navegador.")) restaurarBancoEjemplo();
        }}
      >
        <RotateCcw size={12} /> Restaurar el banco de ejemplo (demostración)
      </button>

      {editando && (
        <EditorPregunta
          inicial={editando}
          temas={temas}
          unidades={[...new Set(delArea.map((p) => p.unidad))]}
          onCancelar={() => setEditando(null)}
          onGuardar={(p) => {
            const existe = banco.some((x) => x.id === p.id);
            guardar(p, existe ? "Editó una pregunta" : "Agregó una pregunta");
            setEditando(null);
            setAbierta(p.id);
            setArea(p.area);
            notificar(existe ? "Pregunta actualizada." : "Pregunta agregada al banco.", "exito");
          }}
        />
      )}
      {importando && (
        <Importar
          area={area}
          por={por}
          onCerrar={() => setImportando(false)}
          onImportar={(a, r, reemplazar) => {
            importarPreguntas(a, r.preguntas, reemplazar);
            registrarEnBitacora(`Importó ${r.preguntas.length} preguntas de Moodle al banco del examen (${nombreArea(a)})${reemplazar ? ", reemplazando las anteriores" : ""}`);
            setImportando(false);
            setArea(a);
            notificar(`Se importaron ${r.preguntas.length} preguntas.`, "exito");
          }}
        />
      )}
    </div>
  );
}

/** Cuántas preguntas activas hay por tema y nivel. */
function Resumen({ preguntas }: { preguntas: Pregunta[] }) {
  const activas = preguntas.filter((p) => p.activa);
  const niveles = [...NIVELES, "sin-nivel" as const].filter((n) => activas.some((p) => p.nivel === n));
  const temas = [...new Set(activas.map((p) => p.tema))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  if (!temas.length) return null;
  return (
    <details className="rounded-xl border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-gray-900">
        {activas.length} preguntas activas en {temas.length} temas · ver cuántas hay por tema y nivel
      </summary>
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Tema</th>
              {niveles.map((n) => (
                <th key={n} className="px-2 py-2 text-center font-medium">
                  {NOMBRE_NIVEL[n]}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {temas.map((t) => (
              <tr key={t}>
                <td className="px-3 py-1.5 text-gray-800">{t}</td>
                {niveles.map((n) => (
                  <td key={n} className="px-2 py-1.5 text-center tabular-nums text-gray-700">
                    {activas.filter((p) => p.tema === t && p.nivel === n).length || "·"}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center font-medium tabular-nums">{activas.filter((p) => p.tema === t).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Importar({ area: inicial, por, onCerrar, onImportar }: { area: AreaEvalId; por: string; onCerrar: () => void; onImportar: (a: AreaEvalId, r: ResultadoImportacion, reemplazar: boolean) => void }) {
  const [area, setArea] = useState(inicial);
  const [r, setR] = useState<ResultadoImportacion | null>(null);
  const [archivo, setArchivo] = useState("");
  const [reemplazar, setReemplazar] = useState(true);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const leer = async (f?: File) => {
    setError("");
    setR(null);
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return setError("El archivo es muy grande (máximo 4 MB).");
    const texto = await f.text();
    const res = importarGift(texto, area, por);
    if (!res.preguntas.length) return setError("No se encontraron preguntas. Exporta el banco desde Moodle en formato GIFT.");
    setArchivo(f.name);
    setR(res);
  };
  const temas = r ? [...new Set(r.preguntas.map((p) => p.tema))] : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="font-semibold text-gray-900">Importar preguntas de Moodle</h2>
        <p className="mt-1 text-sm text-gray-600">
          En Moodle: <em>Banco de preguntas → Exportar</em>, formato <strong>GIFT</strong>. El tema se toma de la categoría y el nivel de la etiqueta (p. ej. “comprender”).
        </p>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-gray-900">Área del examen</span>
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value as AreaEvalId);
              setR(null);
            }}
            className={`${inputBase} mt-1`}
          >
            {AREAS_EVAL.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <input ref={input} type="file" accept=".txt,.gift,text/plain" className="hidden" onChange={(e) => leer(e.target.files?.[0])} />
        <button type="button" className={`${botonSecundario} mt-3`} onClick={() => input.current?.click()}>
          <FileUp size={15} /> {archivo ? "Elegir otro archivo" : "Elegir archivo .txt"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {r && (
          <div className="mt-4 space-y-3">
            <Aviso tono="exito" titulo={`${r.preguntas.length} preguntas listas para importar`}>
              {archivo} · {temas.length} temas.
            </Aviso>
            {!!r.omitidas.length && (
              <Aviso tono="alerta" titulo={`${r.omitidas.length} no se pueden importar`}>
                <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-4 text-xs">
                  {r.omitidas.map((o, i) => (
                    <li key={i}>
                      <span className="font-mono">{o.nombre}</span>: {o.motivo}
                    </li>
                  ))}
                </ul>
              </Aviso>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} className="mt-1" />
              <span>Reemplazar las preguntas que ya hay de {nombreArea(area)} (si no, se agregan a las existentes)</span>
            </label>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className={botonPrimario} disabled={!r} onClick={() => r && onImportar(area, r, reemplazar)}>
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
