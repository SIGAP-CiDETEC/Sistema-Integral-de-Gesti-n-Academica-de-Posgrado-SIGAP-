"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Download, Loader2, Lock, LockOpen, Save, Trash2, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Regresar, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { MODO_API, api } from "@/lib/api";
import { notificar } from "@/lib/avisos-ui";
import { descargarCsv } from "@/lib/csv";
import { DURACIONES, detalleDe, diaSesion, diaSesionTitulo, porSesion, useSeminario, type ConfigSeminario, type DetalleSesion, type EspacioSeminario } from "@/lib/seminario";
import { TextoConEnlaces } from "@/components/TextoConEnlaces";
import { SALAS, nombreSala } from "@/lib/evaluacion";

type Profesor = { id: string; nombre: string; baja?: boolean };

/**
 * Seminario de Inducción (Posgrado): define cuántas sesiones hay, en qué días, a qué hora empiezan y cuántos espacios
 * tiene cada una; abre la elección para que los profesores tomen su día y hora, y asigna profesores directamente.
 */
export function SeminarioPosgrado() {
  const { datos, error, accion } = useSeminario();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  useEffect(() => {
    if (MODO_API) api<Profesor[]>("/profesores").then(setProfesores).catch(() => undefined);
  }, []);

  if (!MODO_API)
    return (
      <>
        <PageHeader titulo="Seminario de inducción" />
        <Aviso tono="info" titulo="Disponible con el servidor">
          Esta sección funciona con el servidor de SIGAP.
        </Aviso>
      </>
    );
  if (!datos) return error ? <Aviso tono="error" titulo="No se pudo cargar el seminario">{error}</Aviso> : <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" /> Cargando…</p>;

  const ocupados = datos.espacios.filter((e) => e.profesorId).length;
  const csv = () =>
    descargarCsv(
      `${datos.config.titulo.replace(/\s+/g, "_")}.csv`,
      ["Día", "Horario", "Modalidad", "Lugar o enlace", "Profesor investigador", "Laboratorio", "Lo eligió"],
      datos.espacios.map((e) => [diaSesion(e.fecha), `${e.inicio} a ${e.fin}`, detalleDe(datos.config, e.fecha).modalidad === "en-linea" ? "En línea" : "Presencial", detalleDe(datos.config, e.fecha).lugar, e.profesor ?? "", e.laboratorio ?? "", e.por === "posgrado" ? "Asignado por Posgrado" : e.por === "profesor" ? "El profesor" : ""]),
    );

  return (
    <>
      <Regresar href="/posgrado/evaluacion" t="Evaluación" />
      <PageHeader titulo="Seminario de inducción" subtitulo="Sesiones, horarios y profesores investigadores que presentan su laboratorio" />

      <Configuracion
        key={JSON.stringify(datos.config)}
        inicial={datos.config}
        publicado={datos.publicado}
        onGuardar={async (config) => {
          let e = await accion("/seminario", { config }, "PUT");
          if (e && /Confirma para quitarlos/.test(e) && window.confirm(`${e}\n\n¿Quitar esos espacios?`)) e = await accion("/seminario", { config, forzar: true }, "PUT");
          if (e) notificar(e);
          else notificar("Seminario guardado.", "exito");
        }}
      />

      {datos.publicado && (
        <Tarjeta
          titulo={`Horarios · ${ocupados} de ${datos.espacios.length} con profesor`}
          accion={
            <button type="button" onClick={csv} className={botonSecundario}>
              <Download size={15} /> Descargar CSV
            </button>
          }
          className="mt-6"
        >
          <div className="space-y-6">
            {porSesion(datos.espacios).map((s, i) => (
              <section key={s.fecha}>
                <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                  Sesión {i + 1} · {diaSesionTitulo(s.fecha)}
                  <LugarSesion c={datos.config} fecha={s.fecha} />
                </h3>
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {s.espacios.map((e) => (
                    <FilaEspacio key={`${e.id}|${e.profesorId ?? ""}|${e.laboratorio ?? ""}`} e={e} profesores={profesores} onAsignar={(profesorId, laboratorio) => accion("/seminario/asignar", { espacio: e.id, profesorId, laboratorio })} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Tarjeta>
      )}
    </>
  );
}

function Configuracion({ inicial, publicado, onGuardar }: { inicial: ConfigSeminario; publicado: boolean; onGuardar: (c: ConfigSeminario) => Promise<void> }) {
  const [c, setC] = useState(inicial);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiar = <K extends keyof ConfigSeminario>(k: K, v: ConfigSeminario[K]) => setC({ ...c, [k]: v });
  const guardar = async (cfg = c) => {
    setGuardando(true);
    await onGuardar(cfg);
    setGuardando(false);
  };
  const fin = (() => {
    const [h, m] = c.horaInicio.split(":").map(Number);
    const t = h * 60 + m + c.duracionMin * c.espaciosPorSesion;
    return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  })();

  return (
    <Tarjeta
      titulo="Sesiones del seminario"
      accion={
        publicado ? (
          <Etiqueta tono={c.abierto ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>{c.abierto ? "Abierto para que elijan los profesores" : "Elección cerrada"}</Etiqueta>
        ) : (
          <Etiqueta tono="bg-amber-50 text-amber-800">Sin publicar</Etiqueta>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-gray-800">Nombre</span>
          <input value={c.titulo} maxLength={120} onChange={(e) => cambiar("titulo", e.target.value)} className={`${inputBase} mt-1`} />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-800">Aula de las sesiones presenciales</span>
          <SelectorLugar valor={c.lugar} onChange={(v) => cambiar("lugar", v)} vacio="Elige un aula" className="mt-1" />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-800">Hora de inicio de cada sesión</span>
          <input type="time" value={c.horaInicio} onChange={(e) => cambiar("horaInicio", e.target.value)} className={`${inputBase} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="font-medium text-gray-800">Minutos por profesor</span>
            <select value={c.duracionMin} onChange={(e) => cambiar("duracionMin", Number(e.target.value))} className={`${inputBase} mt-1`}>
              {DURACIONES.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-gray-800">Profesores por sesión</span>
            <input type="number" min={1} max={20} value={c.espaciosPorSesion} onChange={(e) => cambiar("espaciosPorSesion", Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={`${inputBase} mt-1`} />
          </label>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Cada sesión dura de {c.horaInicio} a {fin} h: {c.espaciosPorSesion} {c.espaciosPorSesion === 1 ? "espacio" : "espacios"} de {c.duracionMin} min, uno por profesor.
      </p>

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-800">Días de las sesiones ({c.sesiones.length})</p>
        <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {[...c.sesiones].sort().map((f) => {
            const d = c.porSesion?.[f] ?? { modalidad: "presencial" as const, lugar: "" };
            const fijar = (x: Partial<DetalleSesion>) => cambiar("porSesion", { ...c.porSesion, [f]: { ...d, ...x } });
            const enLinea = d.modalidad === "en-linea";
            return (
              <li key={f} className="grid items-center gap-2 px-3 py-2 text-sm sm:grid-cols-[12rem_9rem_1fr_auto]">
                <span className="font-medium text-gray-800">{diaSesionTitulo(f)}</span>
                <select value={d.modalidad} onChange={(e) => fijar({ modalidad: e.target.value as DetalleSesion["modalidad"], lugar: "" })} className={`${inputBase} py-1.5`} aria-label="Modalidad">
                  <option value="presencial">Presencial</option>
                  <option value="en-linea">En línea</option>
                </select>
                {enLinea ? (
                  <input
                    value={d.lugar}
                    maxLength={500}
                    onChange={(e) => fijar({ lugar: e.target.value })}
                    placeholder="Enlace de la videollamada (Meet, Teams, Zoom…)"
                    className={`${inputBase} py-1.5 ${!d.lugar.trim() ? "border-amber-400" : ""}`}
                    aria-label="Enlace"
                  />
                ) : (
                  <SelectorLugar valor={d.lugar} onChange={(v) => fijar({ lugar: v })} vacio={c.lugar ? `${c.lugar} (la de todas las sesiones)` : "Aula de todas las sesiones"} compacto />
                )}
                <button type="button" aria-label={`Quitar ${f}`} onClick={() => cambiar("sesiones", c.sesiones.filter((x) => x !== f))} className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700">
                  <X size={15} />
                </button>
              </li>
            );
          })}
        </ul>
        {c.sesiones.some((f) => c.porSesion?.[f]?.modalidad === "en-linea" && !c.porSesion?.[f]?.lugar.trim()) && (
          <p className="mt-1 text-xs text-amber-700">Falta el enlace de alguna sesión en línea; puedes agregarlo después.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="date" value={nueva} onChange={(e) => setNueva(e.target.value)} className={`${inputBase} w-auto`} />
          <button
            type="button"
            disabled={!nueva || c.sesiones.includes(nueva)}
            onClick={() => {
              cambiar("sesiones", [...c.sesiones, nueva].sort());
              setNueva("");
            }}
            className={botonSecundario}
          >
            <CalendarPlus size={15} /> Agregar día
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={c.abierto} onChange={(e) => cambiar("abierto", e.target.checked)} className="mt-1" />
          <span>
            <span className="font-medium text-gray-800">Los profesores pueden elegir su día y hora</span>
            <span className="block text-xs text-gray-500">Desmárcalo cuando ya no quieras cambios; tú puedes seguir asignando.</span>
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-800">Horarios que puede elegir cada profesor</span>
          <input type="number" min={1} max={10} value={c.maxPorProfesor} onChange={(e) => cambiar("maxPorProfesor", Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className={`${inputBase} mt-1 w-24`} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <button type="button" disabled={guardando || !c.sesiones.length} onClick={() => guardar()} className={botonPrimario}>
          {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {publicado ? "Guardar cambios" : "Publicar seminario"}
        </button>
        {publicado && (
          <button type="button" disabled={guardando} onClick={() => guardar({ ...c, abierto: !c.abierto })} className={botonSecundario}>
            {c.abierto ? <Lock size={15} /> : <LockOpen size={15} />} {c.abierto ? "Cerrar la elección" : "Abrir la elección"}
          </button>
        )}
      </div>
    </Tarjeta>
  );
}

function FilaEspacio({ e, profesores, onAsignar }: { e: EspacioSeminario; profesores: Profesor[]; onAsignar: (profesorId: string | null, laboratorio?: string) => Promise<string | null> }) {
  const [prof, setProf] = useState(e.profesorId ?? "");
  const [lab, setLab] = useState(e.laboratorio ?? "");
  const [guardando, setGuardando] = useState(false);
  const cambio = prof !== (e.profesorId ?? "") || lab !== (e.laboratorio ?? "");
  const guardar = async (p: string | null, l?: string) => {
    setGuardando(true);
    const err = await onAsignar(p, l);
    setGuardando(false);
    notificar(err ?? (p ? "Horario asignado." : "Se quitó al profesor del horario."), err ? "error" : "exito");
  };
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
      <span className="w-28 shrink-0 font-mono text-gray-700">
        {e.inicio}–{e.fin}
      </span>
      <select value={prof} onChange={(x) => setProf(x.target.value)} className={`${inputBase} w-auto min-w-[14rem] flex-1 py-1.5`} aria-label="Profesor">
        <option value="">Sin profesor</option>
        {profesores
          .filter((p) => !p.baja || p.id === e.profesorId)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
      </select>
      <input value={lab} maxLength={160} placeholder="Laboratorio" onChange={(x) => setLab(x.target.value)} disabled={!prof} className={`${inputBase} w-auto min-w-[12rem] flex-1 py-1.5`} />
      {e.por && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <UserRound size={12} /> {e.por === "profesor" ? "Lo eligió el profesor" : "Asignado por Posgrado"}
        </span>
      )}
      {cambio && (
        <button type="button" disabled={guardando} onClick={() => guardar(prof || null, prof ? lab : undefined)} className={`${botonPrimario} py-1.5`}>
          {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
        </button>
      )}
      {!cambio && e.profesorId && (
        <button type="button" disabled={guardando} onClick={() => window.confirm(`¿Quitar a ${e.profesor} de este horario?`) && guardar(null)} className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label="Quitar profesor">
          <Trash2 size={15} />
        </button>
      )}
    </li>
  );
}

/** Modalidad y lugar o enlace de una sesión. */
export function LugarSesion({ c, fecha }: { c: ConfigSeminario; fecha: string }) {
  const d = detalleDe(c, fecha);
  const enLinea = d.modalidad === "en-linea";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-normal">
      <span className={`rounded-full px-2 py-0.5 font-medium ${enLinea ? "bg-violet-50 text-violet-800" : "bg-gray-100 text-gray-700"}`}>{enLinea ? "En línea" : "Presencial"}</span>
      {d.lugar ? <span className="min-w-0 break-all text-gray-600"><TextoConEnlaces texto={d.lugar} /></span> : enLinea && <span className="text-amber-700">Enlace por confirmar</span>}
    </span>
  );
}

const AULAS = SALAS.map(nombreSala);

/** Aula del menú de salas de CIDETEC, u otro lugar escrito a mano. */
function SelectorLugar({ valor, onChange, vacio, className = "", compacto = false }: { valor: string; onChange: (v: string) => void; vacio: string; className?: string; compacto?: boolean }) {
  const [otro, setOtro] = useState(!!valor && !AULAS.includes(valor));
  const py = compacto ? "py-1.5" : "";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <select
        value={otro ? "__otro" : valor}
        onChange={(e) => {
          const v = e.target.value;
          setOtro(v === "__otro");
          onChange(v === "__otro" ? "" : v);
        }}
        className={`${inputBase} ${py} min-w-0 flex-1`}
        aria-label="Aula"
      >
        <option value="">{vacio}</option>
        {AULAS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
        <option value="__otro">Otro lugar…</option>
      </select>
      {otro && <input autoFocus value={valor} maxLength={300} placeholder="Escribe el lugar" onChange={(e) => onChange(e.target.value)} className={`${inputBase} ${py} min-w-0 flex-1`} aria-label="Otro lugar" />}
    </div>
  );
}
