import { resultadoFinal, type AspiranteP } from "./posgrado/datos";

/**
 * Lectura del proceso para la Subdirección Académica (solo consulta).
 * Cada aspirante cae en UNA fase, para que la suma cuadre con el total.
 */
export type FaseSub = "registro" | "documentos" | "entrevista" | "evaluacion" | "comision" | "admitido" | "inscrito" | "concluido";

export const FASES_SUBDIRECCION: { id: FaseSub; t: string; color: string }[] = [
  { id: "registro", t: "1 · Registro incompleto", color: "bg-gray-400" },
  { id: "documentos", t: "2 · Revisión de documentos", color: "bg-sky-500" },
  { id: "entrevista", t: "3 · Entrevista colegiada", color: "bg-indigo-500" },
  { id: "evaluacion", t: "4–5 · Evaluación y resultados", color: "bg-violet-500" },
  { id: "comision", t: "Comisión de Admisión / Colegio", color: "bg-amber-500" },
  { id: "admitido", t: "6 · Admitido (resultado publicado) · inscripción en curso", color: "bg-teal-500" },
  { id: "inscrito", t: "Inscrito (número SICEP)", color: "bg-emerald-600" },
  { id: "concluido", t: "Concluido sin admisión", color: "bg-red-400" },
];

export function faseSubdireccion(a: AspiranteP): FaseSub {
  if (a.concluido) return "concluido";
  if (a.etapa === "dictamen") {
    if (a.uteycv?.formalizadoEl) return "inscrito";
    return a.resolucion === "Aceptado" || a.resolucion === "Condicionado" ? "admitido" : "comision";
  }
  return a.etapa;
}

export const nombreFase = (f: FaseSub) => FASES_SUBDIRECCION.find((x) => x.id === f)?.t ?? f;

/** Filtros que llegan desde el inicio (?fase=…). */
export function cumpleFiltro(a: AspiranteP, filtro: string) {
  if (!filtro) return true;
  if (filtro === "proceso") return !a.concluido && !["admitido", "inscrito"].includes(faseSubdireccion(a));
  if (filtro === "admitido") return a.resolucion === "Aceptado" || a.resolucion === "Condicionado";
  return faseSubdireccion(a) === filtro;
}

export function resumenProceso(lista: AspiranteP[]) {
  const proms = lista.map((a) => Number(a.promedio)).filter((n) => !Number.isNaN(n) && n > 0);
  const evaluadas = lista.filter((a) => resultadoFinal(a.evaluacion));
  return {
    total: lista.length,
    enProceso: lista.filter((a) => cumpleFiltro(a, "proceso")).length,
    admitidos: lista.filter((a) => cumpleFiltro(a, "admitido")).length,
    noAdmitidos: lista.filter((a) => a.concluido).length,
    promedioMedio: proms.length ? (proms.reduce((t, n) => t + n, 0) / proms.length).toFixed(1) : "—",
    ipn: lista.filter((a) => a.procedencia.startsWith("IPN")).length,
    entrevistas: lista.filter((a) => a.dictamen).length,
    entrevistasAprobadas: lista.filter((a) => a.dictamen && a.dictamen.resolucion !== "Rechazado").length,
    evaluadas: evaluadas.length,
    acreditadas: evaluadas.filter((a) => resultadoFinal(a.evaluacion)!.acreditado).length,
    inscritos: lista.filter((a) => a.uteycv?.formalizadoEl).length,
  };
}
