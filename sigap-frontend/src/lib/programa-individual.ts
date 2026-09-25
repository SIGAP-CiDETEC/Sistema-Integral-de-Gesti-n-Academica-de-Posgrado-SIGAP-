/**
 * SIP-08 · Programa individual de actividades — DATOS DE EJEMPLO (solo cascarón).
 * Con backend lo captura el asesor académico junto con Control Escolar (UTEyCV)
 * (REP Art. 12) y llega aquí desde la API. Las materias y claves NO son las oficiales.
 */

export type Materia = { clave: string; nombre: string; creditos: number; periodo: "A" | "B"; lugar: string };

export const PROGRAMA_INDIVIDUAL_DEMO = {
  noRegistro: "B260842",
  asesor: { paterno: "Hernández", materno: "Ruiz", nombre: "Laura", titulo: "Dra." },
  materias: [
    { clave: "MTC-0101", nombre: "Matemáticas para Cómputo", creditos: 8, periodo: "A", lugar: "CIDETEC" },
    { clave: "MTC-0102", nombre: "Arquitectura de Computadoras", creditos: 8, periodo: "A", lugar: "CIDETEC" },
    { clave: "MTC-0103", nombre: "Seminario Departamental I", creditos: 4, periodo: "A", lugar: "CIDETEC" },
    { clave: "MTC-0201", nombre: "Cómputo Paralelo", creditos: 8, periodo: "B", lugar: "CIDETEC" },
    { clave: "MTC-0202", nombre: "Metodología de la Investigación", creditos: 6, periodo: "B", lugar: "CIDETEC" },
    { clave: "MTC-0203", nombre: "Seminario Departamental II", creditos: 4, periodo: "B", lugar: "CIDETEC" },
  ] satisfies Materia[],
  creditosMinimos: "80",
  fechaLimite: "31/07/2028",
};

export const nombreAsesor = () => {
  const a = PROGRAMA_INDIVIDUAL_DEMO.asesor;
  return `${a.titulo} ${a.nombre} ${a.paterno} ${a.materno}`;
};
