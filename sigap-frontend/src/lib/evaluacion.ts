/**
 * Modalidades de evaluación y horarios del curso propedéutico.
 * CAMBIAN CADA CONVOCATORIA: con backend se capturarán en
 * Administrador → Configuración de convocatoria (GET /convocatorias/activa/evaluacion).
 * Reemplaza los Forms "Elección cursos propedéuticos o examen" y "Registro cursos propedéuticos".
 */

export type Dia = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado";
export type Sesion = { dia: Dia; inicio: string; fin: string };
export type Grupo = { id: string; sesiones: Sesion[] };
export type Materia = { id: string; nombre: string; grupos: Grupo[] };

export type ModalidadId = "propedeutico" | "examen";

export const MODALIDADES: Record<
  ModalidadId,
  { titulo: string; fechas: string; detalle: string; segundaOportunidad: string }
> = {
  propedeutico: {
    titulo: "Cursos propedéuticos con opción a examen",
    fechas: "27 de abril al 29 de mayo de 2026",
    detalle: "Presencial · duración 5 semanas",
    segundaOportunidad: "Si no acreditas el curso, puedes presentar el examen de admisión el 8 de junio de 2026 (RN-08).",
  },
  examen: {
    titulo: "Presentar solo examen",
    fechas: "8 de junio de 2026",
    detalle: "Examen de admisión directo",
    segundaOportunidad: "Si no acreditas el examen, el proceso termina y podrás participar en una nueva convocatoria (RN-08).",
  },
};

export const MATERIAS: Materia[] = [
  {
    id: "matematicas",
    nombre: "Matemáticas Discretas y Continuas",
    grupos: [
      { id: "A", sesiones: [{ dia: "lunes", inicio: "11:00", fin: "14:00" }, { dia: "jueves", inicio: "10:00", fin: "13:00" }] },
      { id: "B", sesiones: [{ dia: "lunes", inicio: "15:00", fin: "18:00" }, { dia: "viernes", inicio: "15:00", fin: "18:00" }] },
    ],
  },
  {
    id: "programacion",
    nombre: "Programación",
    grupos: [
      { id: "A", sesiones: [{ dia: "martes", inicio: "10:00", fin: "13:00" }, { dia: "miércoles", inicio: "10:00", fin: "13:00" }] },
      { id: "B", sesiones: [{ dia: "martes", inicio: "16:30", fin: "19:30" }, { dia: "jueves", inicio: "16:30", fin: "19:30" }] },
    ],
  },
  {
    id: "seminario",
    nombre: "Seminario de Inducción",
    grupos: [{ id: "Único", sesiones: [{ dia: "viernes", inicio: "11:00", fin: "13:00" }] }],
  },
];

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
