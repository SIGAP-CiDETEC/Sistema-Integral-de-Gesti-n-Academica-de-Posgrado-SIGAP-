import { MODO_API } from "./api";

/**
 * Modalidades de evaluación y horarios del curso propedéutico.
 * CAMBIAN CADA CONVOCATORIA: con backend se capturarán en
 * Administrador → Configuración de convocatoria (GET /convocatorias/activa/evaluacion).
 * Reemplaza los Forms "Elección cursos propedéuticos o examen" y "Registro cursos propedéuticos".
 */

export type Dia = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado";
export type Sesion = { dia: Dia; inicio: string; fin: string };
/**
 * Grupo de un curso propedéutico. El LUGAR lo ve el aspirante; el DOCENTE (id de profesor) solo lo ve
 * el Departamento de Posgrado y es quien captura las calificaciones de ese grupo.
 */
export type Grupo = { id: string; sesiones: Sesion[]; lugar?: string; docente?: string };
export type Materia = { id: string; nombre: string; grupos: Grupo[] };

export type ModalidadId = "propedeutico" | "examen";

export const MODALIDADES: Record<
  ModalidadId,
  { titulo: string; fechas: string; detalle: string; segundaOportunidad: string }
> = {
  propedeutico: {
    titulo: "Cursos propedéuticos con opción a examen",
    fechas: "9 de noviembre al 10 de diciembre de 2026",
    detalle: "Presencial · duración 5 semanas",
    segundaOportunidad: "Si no acreditas una o las dos áreas del curso, puedes presentar el examen de esas áreas el 15 de diciembre de 2026.",
  },
  examen: {
    titulo: "Presentar solo examen",
    fechas: "15 de diciembre de 2026",
    detalle: "Examen de admisión directo",
    segundaOportunidad: "Si no acreditas el examen, el proceso termina y podrás participar en una nueva convocatoria.",
  },
};

const MATERIAS_EJEMPLO: Materia[] = [
  {
    id: "matematicas",
    nombre: "Matemáticas Discretas y Continuas",
    grupos: [
      { id: "A", sesiones: [{ dia: "lunes", inicio: "11:00", fin: "14:00" }, { dia: "jueves", inicio: "10:00", fin: "13:00" }], lugar: "Aula 1, CIDETEC", docente: "ac" },
      { id: "B", sesiones: [{ dia: "lunes", inicio: "15:00", fin: "18:00" }, { dia: "viernes", inicio: "15:00", fin: "18:00" }], lugar: "Aula 2, CIDETEC", docente: "ac" },
    ],
  },
  {
    id: "programacion",
    nombre: "Programación",
    grupos: [
      { id: "A", sesiones: [{ dia: "martes", inicio: "10:00", fin: "13:00" }, { dia: "miércoles", inicio: "10:00", fin: "13:00" }], lugar: "Laboratorio de cómputo 1, CIDETEC", docente: "rm" },
      { id: "B", sesiones: [{ dia: "martes", inicio: "16:30", fin: "19:30" }, { dia: "jueves", inicio: "16:30", fin: "19:30" }], lugar: "Laboratorio de cómputo 2, CIDETEC", docente: "rm" },
    ],
  },
  {
    id: "seminario",
    nombre: "Seminario de Inducción",
    grupos: [{ id: "Único", sesiones: [{ dia: "viernes", inicio: "11:00", fin: "13:00" }], lugar: "Sala de juntas CIDETEC", docente: "lh" }],
  },
];

/**
 * Materias y grupos de la convocatoria. Los docentes de ejemplo solo existen en la demostración: con el servidor
 * real los grupos empiezan sin docente y Posgrado los asigna en Evaluación → Editar fechas y horarios.
 */
export const MATERIAS: Materia[] = MODO_API
  ? MATERIAS_EJEMPLO.map((m) => ({ ...m, grupos: m.grupos.map((g) => ({ ...g, docente: undefined })) }))
  : MATERIAS_EJEMPLO;

export const DIAS: Dia[] = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "lunes y viernes 15:00 a 18:00 h" o "lunes 11:00 a 14:00 h y jueves 10:00 a 13:00 h" */
export function describirGrupo(g: Grupo): string {
  const mismaHora = g.sesiones.every((s) => s.inicio === g.sesiones[0].inicio && s.fin === g.sesiones[0].fin);
  const unir = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : xs[0]);
  if (mismaHora) return `${unir(g.sesiones.map((s) => s.dia))} ${g.sesiones[0].inicio} a ${g.sesiones[0].fin} h`;
  return unir(g.sesiones.map((s) => `${s.dia} ${s.inicio} a ${s.fin} h`));
}

const minutos = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};

/** Devuelve los choques de horario entre los grupos elegidos (si los hay). */
export function choques(elegidos: { materia: Materia; grupo: Grupo }[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < elegidos.length; i++)
    for (let j = i + 1; j < elegidos.length; j++)
      for (const a of elegidos[i].grupo.sesiones)
        for (const b of elegidos[j].grupo.sesiones)
          if (a.dia === b.dia && minutos(a.inicio) < minutos(b.fin) && minutos(b.inicio) < minutos(a.fin))
            out.push(`${elegidos[i].materia.nombre} y ${elegidos[j].materia.nombre} se cruzan el ${a.dia}.`);
  return out;
}

/** Lugar del grupo (lo ve el aspirante). */
export const lugarDe = (g?: Grupo) => g?.lugar?.trim() || "Lugar por confirmar";

/** Docente del grupo (solo Posgrado). Las configuraciones guardadas antes no lo traían: se toma el de la convocatoria. */
export function docenteDe(materia: string, grupo: string, materias: Materia[]): string | undefined {
  const g = materias.find((m) => m.id === materia)?.grupos.find((x) => x.id === grupo);
  if (g?.docente) return g.docente;
  const base = MATERIAS.find((m) => m.id === materia);
  return (base?.grupos.find((x) => x.id === grupo) ?? base?.grupos[0])?.docente;
}
