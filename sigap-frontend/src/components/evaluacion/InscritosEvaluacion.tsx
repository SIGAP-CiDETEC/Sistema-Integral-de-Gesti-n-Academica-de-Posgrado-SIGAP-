"use client";

import { Download, Users } from "lucide-react";
import { Tarjeta, botonSecundario } from "@/components/posgrado/ui";
import { descargarCsv, fechaArchivo } from "@/lib/csv";
import { idTemporal } from "@/lib/id-temporal";
import { describirGrupo, docenteDe, lugarDe, type Materia } from "@/lib/evaluacion";
import { nombreProfesor, type AspiranteP } from "@/lib/posgrado/datos";

const fechaEleccion = (f?: string) => (f ? new Date(f).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" }) : "");
const enGrupo = (a: AspiranteP, m: Materia, g: string) => a.evaluacion?.modalidad === "propedeutico" && (a.evaluacion.grupos?.[m.id] ?? (m.grupos.length === 1 ? m.grupos[0].id : undefined)) === g;
const nombreGrupo = (m: Materia, g: string) => (m.grupos.length === 1 ? "único" : g);
const archivo = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Aspirantes inscritos a los cursos propedéuticos (por curso y grupo) y al examen, con su lista descargable.
 * - posgrado: todos los grupos y el examen, con correo y teléfono.
 * - docente: solo los grupos que imparte (ID temporal y nombre).
 */
export function InscritosEvaluacion({ aspirantes, materias, modo, docente }: { aspirantes: AspiranteP[]; materias: Materia[]; modo: "posgrado" | "docente"; docente?: string }) {
  const todos = aspirantes.filter((a) => a.evaluacion?.modalidad);
  const grupos = materias.flatMap((m) =>
    m.grupos
      .filter((g) => modo === "posgrado" || docenteDe(m.id, g.id, materias) === docente)
      .map((g) => ({ m, g, inscritos: todos.filter((a) => enGrupo(a, m, g.id)) })),
  );
  const examen = todos.filter((a) => a.evaluacion.modalidad === "examen");
  const conPosgrado = modo === "posgrado";

  const encabezados = ["ID temporal", "Nombre", ...(conPosgrado ? ["Correo", "Teléfono"] : [])];
  const fila = (a: AspiranteP) => [idTemporal(a.id), a.nombre, ...(conPosgrado ? [a.correo, a.telefono] : [])];

  const bajarGrupo = (m: Materia, g: string, lista: AspiranteP[]) =>
    descargarCsv(
      `Inscritos_${archivo(m.nombre)}_grupo-${nombreGrupo(m, g)}_${fechaArchivo()}.csv`,
      [...encabezados, "Curso", "Grupo", ...(conPosgrado ? ["Docente", "Fecha de elección"] : [])],
      lista.map((a) => [...fila(a), m.nombre, nombreGrupo(m, g), ...(conPosgrado ? [nombreProfesor(docenteDe(m.id, g, materias) ?? "") || "", fechaEleccion(a.evaluacion.confirmadaEl)] : [])]),
    );

  const bajarTodo = () =>
    descargarCsv(
      `Inscritos_evaluacion_${fechaArchivo()}.csv`,
      [...encabezados, "Elección", ...materias.map((m) => `Grupo ${m.nombre}`), "Fecha de elección"],
      todos.map((a) => [
        ...fila(a),
        a.evaluacion.modalidad === "propedeutico" ? "Cursos propedéuticos" : "Solo examen",
        ...materias.map((m) => (a.evaluacion.modalidad === "propedeutico" ? nombreGrupo(m, a.evaluacion.grupos?.[m.id] ?? m.grupos[0]?.id ?? "") : "")),
        fechaEleccion(a.evaluacion.confirmadaEl),
      ]),
    );

  return (
    <Tarjeta
      titulo={
        <span className="flex items-center gap-2">
          <Users size={17} className="text-primary" /> {conPosgrado ? "Aspirantes inscritos" : "Aspirantes inscritos a tus grupos"}
        </span>
      }
      accion={
        conPosgrado && todos.length > 0 ? (
          <button type="button" className={botonSecundario} onClick={bajarTodo}>
            <Download size={15} /> Descargar todo
          </button>
        ) : undefined
      }
      className="mt-6"
    >
      {conPosgrado && (
        <p className="mb-4 text-sm text-gray-600">
          {todos.length} aspirante(s) ya eligieron: {todos.length - examen.length} a cursos propedéuticos y {examen.length} solo examen.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map(({ m, g, inscritos }) => (
          <div key={m.id + g.id} className="flex flex-col rounded-lg border border-gray-200 p-4 text-sm">
            <p className="font-medium text-gray-900">
              {m.nombre} · grupo {nombreGrupo(m, g.id)}
            </p>
            <p className="text-xs text-gray-500">{describirGrupo(g)}</p>
            <p className="text-xs text-gray-500">{lugarDe(g)}</p>
            {conPosgrado && <p className="text-xs text-gray-500">Docente: {nombreProfesor(docenteDe(m.id, g.id, materias) ?? "") || "por asignar"}</p>}
            <p className={`mt-2 ${g.cupo && inscritos.length >= g.cupo ? "text-red-700" : "text-gray-800"}`}>
              <b>{inscritos.length}</b> inscrito(s){g.cupo ? ` de ${g.cupo} lugares${inscritos.length >= g.cupo ? " · lleno" : ""}` : ""}
            </p>
            {inscritos.length > 0 && (
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-gray-600">
                {inscritos.map((a) => (
                  <li key={a.id}>
                    <span className="font-mono">{idTemporal(a.id)}</span> · {a.nombre}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" disabled={!inscritos.length} onClick={() => bajarGrupo(m, g.id, inscritos)} className={`${botonSecundario} mt-3 self-start`}>
              <Download size={15} /> Descargar lista
            </button>
          </div>
        ))}
        {conPosgrado && (
          <div className="flex flex-col rounded-lg border border-gray-200 p-4 text-sm">
            <p className="font-medium text-gray-900">Solo examen de admisión</p>
            <p className="text-xs text-gray-500">Lo aplica y califica la Jefatura de Posgrado</p>
            <p className="mt-2 text-gray-800">
              <b>{examen.length}</b> inscrito(s)
            </p>
            {examen.length > 0 && (
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-gray-600">
                {examen.map((a) => (
                  <li key={a.id}>
                    <span className="font-mono">{idTemporal(a.id)}</span> · {a.nombre}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={!examen.length}
              onClick={() => descargarCsv(`Inscritos_examen_${fechaArchivo()}.csv`, [...encabezados, "Fecha de elección"], examen.map((a) => [...fila(a), fechaEleccion(a.evaluacion.confirmadaEl)]))}
              className={`${botonSecundario} mt-3 self-start`}
            >
              <Download size={15} /> Descargar lista
            </button>
          </div>
        )}
        {!grupos.length && !conPosgrado && <p className="text-sm text-gray-500">No tienes grupos asignados.</p>}
      </div>
    </Tarjeta>
  );
}
