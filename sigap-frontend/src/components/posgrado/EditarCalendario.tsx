"use client";

import { useState } from "react";
import { CalendarCog, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { DIAS, describirGrupo, type Dia, type Materia } from "@/lib/evaluacion";
import {
  CONFIG_EVALUACION_DEFECTO,
  fechaLargaIso,
  guardarConfigEvaluacion,
  useConfigEvaluacion,
  type ConfigEvaluacion,
} from "@/lib/evaluacion-config";
import { CANAL_TEXTO, usePosgrado, type Canal } from "./PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "./ui";

const mins = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};

/** Lista legible de lo que cambió entre dos configuraciones. */
function diferencias(a: ConfigEvaluacion, b: ConfigEvaluacion) {
  const out: { texto: string; afecta: "propedeutico" | "examen" }[] = [];
  if (a.propedeutico.inicio !== b.propedeutico.inicio || a.propedeutico.fin !== b.propedeutico.fin)
    out.push({ texto: `Cursos propedéuticos: del ${fechaLargaIso(b.propedeutico.inicio)} al ${fechaLargaIso(b.propedeutico.fin)}`, afecta: "propedeutico" });
  if (a.propedeutico.modalidad !== b.propedeutico.modalidad || a.propedeutico.duracion !== b.propedeutico.duracion)
    out.push({ texto: `Cursos propedéuticos: ${b.propedeutico.modalidad}, duración ${b.propedeutico.duracion}`, afecta: "propedeutico" });
  if (a.examen.fecha !== b.examen.fecha || a.examen.hora !== b.examen.hora || a.examen.lugar !== b.examen.lugar)
    out.push({ texto: `Examen de admisión: ${fechaLargaIso(b.examen.fecha)}, ${b.examen.hora} h, ${b.examen.lugar}`, afecta: "examen" });
  b.materias.forEach((m) => {
    const antes = a.materias.find((x) => x.id === m.id);
    m.grupos.forEach((g) => {
      const ga = antes?.grupos.find((x) => x.id === g.id);
      if (!ga) out.push({ texto: `${m.nombre}: nuevo grupo ${g.id} (${describirGrupo(g)})`, afecta: "propedeutico" });
      else if (JSON.stringify(ga.sesiones) !== JSON.stringify(g.sesiones))
        out.push({ texto: `${m.nombre}, grupo ${g.id}: ${describirGrupo(g)}`, afecta: "propedeutico" });
    });
    antes?.grupos.filter((g) => !m.grupos.some((x) => x.id === g.id)).forEach((g) => out.push({ texto: `${m.nombre}: se eliminó el grupo ${g.id}`, afecta: "propedeutico" }));
  });
  return out;
}

/** Fechas de cursos y examen, y horarios de los grupos del propedéutico (editables por Posgrado). */
export function EditarCalendario() {
  const { config, modalidades, editada } = useConfigEvaluacion();
  const { aspirantes, enviarAviso, registrarEnBitacora } = usePosgrado();
  const [borrador, setBorrador] = useState<ConfigEvaluacion | null>(null);
  const [avisar, setAvisar] = useState(true);
  const [canal, setCanal] = useState<Canal>("ambos");
  const [guardado, setGuardado] = useState("");

  const enEvaluacion = aspirantes.filter((a) => a.etapa === "evaluacion" && !a.concluido);
  const usados = (materia: string, grupo: string) =>
    enEvaluacion.filter((a) => a.evaluacion.modalidad === "propedeutico" && a.evaluacion.grupos[materia] === grupo).length;

  if (!borrador) {
    return (
      <Tarjeta
        titulo={<span className="flex items-center gap-2"><CalendarCog size={17} className="text-primary" /> Fechas y horarios {editada && <Etiqueta tono="bg-amber-50 text-amber-800">Modificados por Posgrado</Etiqueta>}</span>}
        accion={
          <button type="button" className={botonSecundario} onClick={() => { setBorrador(structuredClone(config)); setGuardado(""); }}>
            <Pencil size={14} /> Editar fechas y horarios
          </button>
        }
      >
        {guardado && (
          <div className="mb-4">
            <Aviso tono="exito" titulo="Cambios guardados">{guardado}</Aviso>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {(["propedeutico", "examen"] as const).map((m) => (
            <div key={m} className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-gray-900">{modalidades[m].titulo}</p>
              <p className="text-gray-600">{modalidades[m].fechas}</p>
              <p className="text-xs text-gray-500">{modalidades[m].detalle}</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{enEvaluacion.filter((a) => a.evaluacion.modalidad === m).length}</p>
              <p className="text-xs text-gray-500">aspirantes</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {config.materias.map((m) => (
            <div key={m.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900">{m.nombre}</p>
              <ul className="mt-1.5 space-y-1">
                {m.grupos.map((g) => (
                  <li key={g.id} className="flex justify-between gap-2 text-xs text-gray-600">
                    <span>
                      Grupo {g.id}: {describirGrupo(g)}
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900" title="Aspirantes inscritos">{usados(m.id, g.id)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Tarjeta>
    );
  }

  const b = borrador;
  const set = (fn: (c: ConfigEvaluacion) => void) => {
    const c = structuredClone(b);
    fn(c);
    setBorrador(c);
  };
  const setMateria = (mi: number, fn: (m: Materia) => void) => set((c) => fn(c.materias[mi]));

  const errores: string[] = [];
  if (b.propedeutico.fin < b.propedeutico.inicio) errores.push("La fecha de fin del propedéutico es anterior al inicio.");
  if (b.examen.fecha <= b.propedeutico.fin) errores.push("El examen debe ser después de que terminen los cursos (es la segunda oportunidad, RN-08).");
  b.materias.forEach((m) =>
    m.grupos.forEach((g) => {
      if (!g.sesiones.length) errores.push(`${m.nombre}, grupo ${g.id}: agrega al menos una sesión.`);
      g.sesiones.forEach((s) => mins(s.fin) <= mins(s.inicio) && errores.push(`${m.nombre}, grupo ${g.id}: la hora de fin debe ser después del inicio.`));
    }),
  );
  const cambios = diferencias(config, b);

  const guardar = () => {
    guardarConfigEvaluacion(b);
    registrarEnBitacora(`Cambió fechas y horarios de la evaluación: ${cambios.map((c) => c.texto).join("; ")}`);
    let texto = `${cambios.length} cambio(s) guardado(s).`;
    if (avisar) {
      const tocaProp = cambios.some((c) => c.afecta === "propedeutico");
      const tocaExamen = cambios.some((c) => c.afecta === "examen");
      // Propedéutico: quienes lo cursan. Examen: todos los que están en evaluación (también es la segunda oportunidad)
      const ids = enEvaluacion
        .filter((a) => tocaExamen || (tocaProp && a.evaluacion.modalidad === "propedeutico"))
        .map((a) => a.id);
      if (ids.length) {
        enviarAviso(
          ids,
          canal,
          "Cambio en las fechas u horarios de tu evaluación",
          `Estimado(a) aspirante:\n\nEl Departamento de Posgrado actualizó las fechas u horarios de la evaluación:\n${cambios
            .map((c) => `• ${c.texto}`)
            .join("\n")}\n\nConsulta tu horario en SIGAP (fase 4 · Evaluación).\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
        );
        texto += ` Se avisó a ${ids.length} aspirante(s) por ${CANAL_TEXTO[canal]}.`;
      }
    }
    setGuardado(texto);
    setBorrador(null);
  };

  return (
    <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarCog size={17} className="text-primary" /> Editar fechas y horarios</span>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Cursos propedéuticos</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo t="Inicio"><input type="date" value={b.propedeutico.inicio} onChange={(e) => set((c) => void (c.propedeutico.inicio = e.target.value))} className={inputBase} /></Campo>
            <Campo t="Fin"><input type="date" value={b.propedeutico.fin} onChange={(e) => set((c) => void (c.propedeutico.fin = e.target.value))} className={inputBase} /></Campo>
            <Campo t="Modalidad">
              <select value={b.propedeutico.modalidad} onChange={(e) => set((c) => void (c.propedeutico.modalidad = e.target.value as ConfigEvaluacion["propedeutico"]["modalidad"]))} className={inputBase}>
                <option>Presencial</option>
                <option>En línea</option>
                <option>Mixta</option>
              </select>
            </Campo>
            <Campo t="Duración"><input value={b.propedeutico.duracion} onChange={(e) => set((c) => void (c.propedeutico.duracion = e.target.value))} className={inputBase} /></Campo>
          </div>
        </fieldset>
        <fieldset className="rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Examen de admisión</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo t="Fecha"><input type="date" value={b.examen.fecha} onChange={(e) => set((c) => void (c.examen.fecha = e.target.value))} className={inputBase} /></Campo>
            <Campo t="Hora"><input type="time" value={b.examen.hora} onChange={(e) => set((c) => void (c.examen.hora = e.target.value))} className={inputBase} /></Campo>
            <div className="sm:col-span-2">
              <Campo t="Lugar o enlace"><input value={b.examen.lugar} onChange={(e) => set((c) => void (c.examen.lugar = e.target.value))} className={inputBase} /></Campo>
            </div>
          </div>
        </fieldset>
      </div>

      <p className="mb-2 mt-5 text-sm font-semibold text-gray-900">Horarios de los grupos</p>
      <div className="space-y-4">
        {b.materias.map((m, mi) => (
          <div key={m.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{m.nombre}</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() =>
                  setMateria(mi, (x) => {
                    const letras = "ABCDEFGH".split("").filter((l) => !x.grupos.some((g) => g.id === l));
                    x.grupos.push({ id: letras[0] ?? String(x.grupos.length + 1), sesiones: [{ dia: "lunes", inicio: "10:00", fin: "13:00" }] });
                  })
                }
              >
                <Plus size={13} /> Agregar grupo
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {m.grupos.map((g, gi) => (
                <div key={g.id} className="rounded-md bg-gray-50 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-800">
                      Grupo {g.id} <span className="text-xs font-normal text-gray-500">· {usados(m.id, g.id)} aspirante(s)</span>
                    </span>
                    {m.grupos.length > 1 && (
                      <button
                        type="button"
                        disabled={usados(m.id, g.id) > 0}
                        title={usados(m.id, g.id) ? "Tiene aspirantes inscritos: primero cámbialos de grupo" : "Eliminar grupo"}
                        onClick={() => setMateria(mi, (x) => void x.grupos.splice(gi, 1))}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={12} /> Eliminar grupo
                      </button>
                    )}
                  </div>
                  {g.sesiones.map((s, si) => (
                    <div key={si} className="mb-1.5 grid grid-cols-[1fr_auto_auto_auto] items-center gap-1.5">
                      <select aria-label="Día" value={s.dia} onChange={(e) => setMateria(mi, (x) => void (x.grupos[gi].sesiones[si].dia = e.target.value as Dia))} className={`${inputBase} py-1.5`}>
                        {DIAS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                      <input aria-label="Inicio" type="time" value={s.inicio} onChange={(e) => setMateria(mi, (x) => void (x.grupos[gi].sesiones[si].inicio = e.target.value))} className={`${inputBase} w-[110px] py-1.5`} />
                      <input aria-label="Fin" type="time" value={s.fin} onChange={(e) => setMateria(mi, (x) => void (x.grupos[gi].sesiones[si].fin = e.target.value))} className={`${inputBase} w-[110px] py-1.5`} />
                      <button type="button" aria-label="Quitar sesión" onClick={() => setMateria(mi, (x) => void x.grupos[gi].sesiones.splice(si, 1))} className="rounded p-1.5 text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setMateria(mi, (x) => void x.grupos[gi].sesiones.push({ dia: "viernes", inicio: "10:00", fin: "12:00" }))} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus size={12} /> Agregar sesión
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {errores.length > 0 && (
        <div className="mt-4">
          <Aviso tono="error" titulo="Revisa lo siguiente">
            {errores.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Aviso>
        </div>
      )}

      {cambios.length > 0 && !errores.length && (
        <div className="mt-4 rounded-lg border border-gray-200 p-3 text-sm">
          <p className="font-medium text-gray-900">Cambios por guardar</p>
          <ul className="mt-1 list-disc pl-5 text-gray-700">
            {cambios.map((c) => (
              <li key={c.texto}>{c.texto}</li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
            Avisar a los aspirantes afectados por
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} disabled={!avisar} className={`${inputBase} w-auto py-1`}>
              <option value="ambos">correo y sistema</option>
              <option value="correo">correo</option>
              <option value="sistema">sistema (SIGAP)</option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-gray-500 underline"
          onClick={() => setBorrador(structuredClone(CONFIG_EVALUACION_DEFECTO))}
        >
          <RotateCcw size={12} /> Volver a los de la convocatoria
        </button>
        <div className="flex gap-2">
          <button type="button" className={botonSecundario} onClick={() => setBorrador(null)}>
            Cancelar
          </button>
          <button type="button" className={botonPrimario} disabled={!cambios.length || errores.length > 0} onClick={guardar}>
            <CheckCircle2 size={15} /> Guardar cambios
          </button>
        </div>
      </div>
    </Tarjeta>
  );
}

function Campo({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-gray-700">
      {t}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
