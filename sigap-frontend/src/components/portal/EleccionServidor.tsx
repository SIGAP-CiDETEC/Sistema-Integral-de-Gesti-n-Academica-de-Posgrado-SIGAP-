"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, CheckCircle2, ClipboardList, Loader2, MapPin, ShieldAlert, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Tarjeta, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { api } from "@/lib/api";
import { mensajeDe } from "@/lib/avisos-ui";
import { choques, describirGrupo, lugarDe, type Grupo, type Materia } from "@/lib/evaluacion";
import { fechaLargaIso } from "@/lib/evaluacion-config";

type Config = {
  propedeutico?: { inicio?: string; fin?: string; modalidad?: string; duracion?: string };
  examen?: { fecha?: string; hora?: string; lugar?: string };
  materias: Materia[];
};
type Yo = {
  nombre: string;
  idTemporal: string;
  puedeElegir: boolean;
  motivo?: string;
  config: Config | null;
  eleccion: { modalidad: "propedeutico" | "examen"; confirmadaEl?: string; grupos: Record<string, string>; docentes: Record<string, string> } | null;
};

const fecha = (f?: string) => (f ? fechaLargaIso(f) : "por confirmar");
const rango = (c?: Config["propedeutico"]) => (c?.inicio && c.fin ? `del ${fechaLargaIso(c.inicio)} al ${fechaLargaIso(c.fin)}` : "fechas por confirmar");

/**
 * Portal del aspirante con el servidor real (primera etapa): solo su nombre, su ID temporal y la elección entre cursos
 * propedéuticos o examen. Antes de elegir ve horarios y lugares; al confirmar (irreversible) ve quién imparte cada curso.
 */
export function EleccionServidor() {
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState("");
  const [modalidad, setModalidad] = useState<"propedeutico" | "examen" | null>(null);
  const [grupos, setGrupos] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<Yo>("/portal/yo")
      .then(setYo)
      .catch((e) => setError(mensajeDe(e)));
  }, []);

  if (error && !yo)
    return (
      <Aviso tono="error" titulo="No se pudo cargar tu información">
        {error}
      </Aviso>
    );
  if (!yo)
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" /> Cargando…
      </p>
    );

  const materias = yo.config?.materias ?? [];
  const elegidos = materias.map((m) => ({ materia: m, grupo: m.grupos.length === 1 ? m.grupos[0] : m.grupos.find((g) => g.id === grupos[m.id]) }));
  const completos = elegidos.every((x) => x.grupo);
  const cruces = completos ? choques(elegidos as { materia: Materia; grupo: Grupo }[]) : [];
  const listo = modalidad === "examen" || (modalidad === "propedeutico" && completos && !cruces.length);

  const confirmar = async () => {
    if (!modalidad) return;
    setEnviando(true);
    setError("");
    try {
      const gruposFinal = Object.fromEntries(elegidos.filter((x) => x.grupo).map((x) => [x.materia.id, x.grupo!.id]));
      setYo(await api<Yo>("/portal/eleccion", { cuerpo: { modalidad, grupos: modalidad === "propedeutico" ? gruposFinal : {} } }));
      setConfirmando(false);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader titulo="Elección de evaluación" subtitulo="Cursos propedéuticos o examen de admisión" />

      <Tarjeta titulo={<span className="flex items-center gap-2"><UserRound size={17} className="text-primary" /> Tus datos</span>} className="mb-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Nombre completo</dt>
            <dd className="font-medium text-gray-900">{yo.nombre}</dd>
          </div>
          <div>
            <dt className="text-gray-500">ID temporal</dt>
            <dd className="font-mono font-medium text-gray-900">{yo.idTemporal}</dd>
          </div>
        </dl>
      </Tarjeta>

      {yo.eleccion ? (
        <Eleccion yo={yo} />
      ) : !yo.puedeElegir ? (
        <Aviso tono="info" titulo="Aún no puedes elegir">
          {yo.motivo ?? "El Departamento de Posgrado te avisará cuando puedas elegir."}
        </Aviso>
      ) : (
        <>
          <Aviso tono="alerta" titulo="Tu elección es definitiva">
            Revisa con calma los horarios. Una vez que confirmes cursos propedéuticos o examen ya no podrás cambiarlo desde SIGAP.
          </Aviso>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {/* Cursos propedéuticos */}
            <button
              type="button"
              onClick={() => setModalidad("propedeutico")}
              aria-pressed={modalidad === "propedeutico"}
              className={`rounded-xl border-2 bg-white p-5 text-left transition ${modalidad === "propedeutico" ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"}`}
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <BookOpenCheck size={18} className="text-primary" /> Cursos propedéuticos con opción a examen
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                {rango(yo.config?.propedeutico)}
                {yo.config?.propedeutico?.modalidad ? ` · ${yo.config.propedeutico.modalidad}` : ""}
                {yo.config?.propedeutico?.duracion ? ` · ${yo.config.propedeutico.duracion}` : ""}
              </span>
              <span className="mt-2 block text-xs text-gray-500">Si no acreditas alguna área del curso, podrás presentar el examen de esa área.</span>
            </button>
            {/* Examen */}
            <button
              type="button"
              onClick={() => setModalidad("examen")}
              aria-pressed={modalidad === "examen"}
              className={`rounded-xl border-2 bg-white p-5 text-left transition ${modalidad === "examen" ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"}`}
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <ClipboardList size={18} className="text-primary" /> Presentar solo el examen de admisión
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                {fecha(yo.config?.examen?.fecha)}
                {yo.config?.examen?.hora ? ` · ${yo.config.examen.hora} h` : ""}
                {yo.config?.examen?.lugar ? ` · ${yo.config.examen.lugar}` : ""}
              </span>
              <span className="mt-2 block text-xs text-gray-500">Si no acreditas el examen, el proceso termina en esta convocatoria.</span>
            </button>
          </div>

          {modalidad === "propedeutico" && (
            <Tarjeta titulo="Elige tu grupo de cada curso" className="mt-5">
              <div className="space-y-5">
                {materias.map((m) => (
                  <fieldset key={m.id}>
                    <legend className="text-sm font-medium text-gray-900">{m.nombre}</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {m.grupos.map((g) => {
                        const activo = m.grupos.length === 1 || grupos[m.id] === g.id;
                        return (
                          <label
                            key={g.id}
                            className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${activo ? "border-primary bg-indigo-50/60" : "border-gray-200 bg-white hover:border-gray-300"}`}
                          >
                            <input
                              type="radio"
                              name={`grupo-${m.id}`}
                              checked={activo}
                              onChange={() => setGrupos({ ...grupos, [m.id]: g.id })}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="font-medium text-gray-900">{m.grupos.length === 1 ? "Grupo único" : `Grupo ${g.id}`}</span>
                              <span className="mt-0.5 flex items-center gap-1 text-gray-700">
                                <CalendarDays size={13} /> {describirGrupo(g)}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <MapPin size={13} /> {lugarDe(g)}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
              {cruces.length > 0 && (
                <div className="mt-4">
                  <Aviso tono="error" titulo="Los horarios que elegiste se cruzan">
                    {cruces.join(" ")}
                  </Aviso>
                </div>
              )}
            </Tarjeta>
          )}

          {error && (
            <div className="mt-4">
              <Aviso tono="error" titulo="No se registró tu elección">
                {error}
              </Aviso>
            </div>
          )}

          {confirmando ? (
            <div role="alertdialog" aria-labelledby="confirmar-titulo" className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
              <p id="confirmar-titulo" className="flex items-center gap-2 text-base font-semibold">
                <ShieldAlert size={18} /> ¿Estás seguro de tu elección?
              </p>
              <p className="mt-1">
                Elegiste <b>{modalidad === "propedeutico" ? "cursos propedéuticos" : "presentar solo el examen de admisión"}</b>
                {modalidad === "propedeutico" && `: ${elegidos.map((x) => `${x.materia.nombre}, ${x.materia.grupos.length === 1 ? "grupo único" : `grupo ${x.grupo?.id}`}`).join("; ")}`}.
              </p>
              <p className="mt-2 font-medium">Esta selección es irreversible: después de confirmarla ya no podrás cambiarla en SIGAP.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={botonPrimario} disabled={enviando} onClick={confirmar}>
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Sí, confirmar mi elección
                </button>
                <button type="button" className={botonSecundario} disabled={enviando} onClick={() => setConfirmando(false)}>
                  No, quiero revisarla
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <button type="button" className={botonPrimario} disabled={!listo} onClick={() => setConfirmando(true)}>
                Registrar mi elección
              </button>
              {!modalidad && <p className="mt-1 text-xs text-gray-500">Elige cursos propedéuticos o examen.</p>}
              {modalidad === "propedeutico" && !completos && <p className="mt-1 text-xs text-gray-500">Elige un grupo de cada curso.</p>}
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Elección ya registrada: ahora sí se muestra quién imparte cada curso. */
function Eleccion({ yo }: { yo: Yo }) {
  const e = yo.eleccion!;
  const materias = yo.config?.materias ?? [];
  const registrada = e.confirmadaEl && new Date(e.confirmadaEl).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <Tarjeta
      titulo={
        <span className="flex items-center gap-2">
          <CheckCircle2 size={17} className="text-emerald-600" /> {e.modalidad === "propedeutico" ? "Elegiste cursos propedéuticos" : "Elegiste presentar solo el examen"}
        </span>
      }
    >
      <p className="text-sm text-gray-600">{registrada ? `Registrada el ${registrada.replace(/\.$/, "")}.` : "Registrada por el Departamento de Posgrado."} Esta elección es definitiva; si tienes un problema, escribe al Departamento de Posgrado.</p>
      {e.modalidad === "propedeutico" ? (
        <>
          <p className="mt-3 text-sm text-gray-700">{rango(yo.config?.propedeutico)}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Curso</th>
                  <th className="py-2 pr-3 font-medium">Grupo</th>
                  <th className="py-2 pr-3 font-medium">Horario y lugar</th>
                  <th className="py-2 font-medium">Profesor(a)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materias.map((m) => {
                  const g = m.grupos.find((x) => x.id === e.grupos[m.id]);
                  return (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3 font-medium text-gray-900">{m.nombre}</td>
                      <td className="py-2.5 pr-3">{m.grupos.length === 1 ? "Único" : e.grupos[m.id] ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-gray-700">
                        {g ? describirGrupo(g) : "—"}
                        <span className="block text-xs text-gray-500">{lugarDe(g)}</span>
                      </td>
                      <td className="py-2.5">{e.docentes[m.id] || <span className="text-gray-500">Por asignar</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Fecha</dt>
            <dd className="font-medium text-gray-900">{fecha(yo.config?.examen?.fecha)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Hora</dt>
            <dd className="font-medium text-gray-900">{yo.config?.examen?.hora ? `${yo.config.examen.hora} h` : "Por confirmar"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Lugar</dt>
            <dd className="font-medium text-gray-900">{yo.config?.examen?.lugar || "Por confirmar"}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-gray-500">Aplica y califica</dt>
            <dd className="font-medium text-gray-900">Jefatura del Departamento de Posgrado</dd>
          </div>
        </dl>
      )}
    </Tarjeta>
  );
}
