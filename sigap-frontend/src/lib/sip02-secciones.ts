/** Filas de las tablas oficiales del SIP-02. Los IDs se comparten entre registro, editor y PDF. */
export type ColumnaSip = { id: string; label: string; opciones?: string[]; maxLength?: number };
export type TablaSip = { id: string; titulo: string; max: number; columnas: ColumnaSip[]; paginas: number[]; tops: number[]; altos: number[]; xs: number[] };
const col = (id: string, label: string, maxLength = 120): ColumnaSip => ({ id, label, maxLength });
export const TABLAS_SIP02: TablaSip[] = [
  { id: "cursos", titulo: "IV. Otros cursos con valor curricular relacionados al posgrado", max: 8,
    columnas: [col("nombre", "Diplomado o curso"), col("institucion", "Institución que lo otorga"), col("incorporada", "Institución a la que está incorporada (si aplica)"), col("pais", "País"), col("inicio", "Fecha de ingreso (dd/mm/aaaa)"), col("fin", "Fecha de egreso (dd/mm/aaaa)")], paginas: [1], tops: [323], altos: [33.9], xs: [] },
  { id: "becas", titulo: "V. Becas y estímulos académicos", max: 7,
    columnas: [col("nombre", "Nombre de la beca o estímulo"), col("tipo", "Tipo o nivel"), col("vigencia", "Vigencia (desde / hasta)")], paginas: [1], tops: [655.2], altos: [12.7], xs: [51.5, 222.7, 394.1, 565.5] },
  { id: "asociaciones", titulo: "VI. Filiación a asociaciones científicas", max: 6,
    columnas: [col("nombre", "Asociación científica"), col("vigencia", "Vigencia de la filiación")], paginas: [2], tops: [111.4], altos: [12.7], xs: [51.5, 308.5, 566.5] },
  { id: "premios", titulo: "VII. Distinciones y premios obtenidos", max: 5,
    columnas: [col("nombre", "Distinción o premio"), col("otorgante", "Institución o persona que lo otorga"), col("anio", "Año", 4)], paginas: [2], tops: [249.1], altos: [12.7], xs: [51.5, 222.7, 394.1, 566.5] },
  { id: "otrosIdiomas", titulo: "VIII. Otros idiomas (además del inglés ya capturado)", max: 2,
    columnas: [col("idioma", "Idioma", 40), ...["lectura", "auditiva", "escrita", "oral", "aval"].map((id, i) => ({ id, label: ["¿Acreditas comprensión de lectura?", "¿Acreditas comprensión auditiva?", "¿Acreditas expresión escrita?", "¿Acreditas expresión oral?", "¿Tiene aval de la DFLE?"][i], opciones: ["Sí", "No"] }))], paginas: [2], tops: [506.4], altos: [13.8], xs: [] },
  { id: "empleosPrevios", titulo: "IX. Experiencia profesional adicional", max: 7,
    columnas: [col("cargo", "Cargo desempeñado"), col("empresa", "Institución o empresa"), col("funciones", "Principales funciones", 300), col("periodo", "Periodo (desde / hasta)")], paginas: [2], tops: [614], altos: [17.3], xs: [65.5, 192, 318, 444, 566.5] },
  { id: "docencia", titulo: "X. Experiencia docente (los cinco más recientes)", max: 5,
    columnas: [col("institucion", "Institución"), col("unidad", "Unidad de aprendizaje impartida"), col("nivel", "Nivel académico"), col("periodo", "Periodo (desde / hasta)")], paginas: [3], tops: [110.6], altos: [13.9], xs: [51.5, 186.2, 321.3, 442, 573] },
  { id: "proyectosConcluidos", titulo: "XI. Proyectos de investigación concluidos (cinco más recientes)", max: 5,
    columnas: [col("rol", "Rol: director, codirector o participante"), col("clave", "Clave IPN o CONACYT del proyecto (si aplica)"), col("nombre", "Nombre del proyecto"), col("fuente", "Fuente de financiamiento")], paginas: [3], tops: [322], altos: [14], xs: [92.2, 212, 296.3, 472.3, 579.8] },
  { id: "productosConcluidos", titulo: "XI. Productos de investigación concluidos (cinco más recientes)", max: 5,
    columnas: [col("tipo", "Tipo de producto"), col("referencia", "Nombre o referencia bibliográfica completa", 700), col("fecha", "Fecha de entrega o publicación (dd/mm/aaaa)")], paginas: [3], tops: [481], altos: [13.9], xs: [92.2, 266.7, 489.8, 569.2] },
  { id: "proyectosDesarrollo", titulo: "XII. Proyectos de investigación en desarrollo", max: 6,
    columnas: [col("rol", "Director, codirector o participante"), col("clave", "Clave de registro (si aplica)"), col("nombre", "Nombre del proyecto"), col("descripcion", "Breve descripción", 500), col("fuente", "Fuente de financiamiento")], paginas: [3, 4], tops: [719.2, 48.4], altos: [13.9, 13.9], xs: [65.5, 167.6, 268.1, 368.5, 469, 569.2] },
  { id: "productosDesarrollo", titulo: "XII. Productos de investigación en desarrollo", max: 6,
    columnas: [col("producto", "Producto obtenido o en preparación"), col("descripcion", "Descripción breve, avance y resultados", 700), col("fecha", "Fecha prevista (dd/mm/aaaa)")], paginas: [4], tops: [145.4], altos: [13.9], xs: [65.5, 233.3, 401.3, 569.2] },
  { id: "recursosHumanos", titulo: "XIII. Formación de recursos humanos", max: 6,
    columnas: [col("tipo", "Tipo: tesis dirigida, servicio social o alumnos dirigidos"), col("numero", "Número de personas o tesis", 5), col("nivel", "Nivel académico"), col("institucion", "Institución y unidad académica"), col("resultados", "Productos o resultados", 500)], paginas: [4], tops: [330.1], altos: [10.9], xs: [51.5, 157.1, 260.7, 367.8, 462.6, 569.2] },
];
export const idCeldaSip = (tabla: string, fila: number, columna: string) => `sip02_${tabla}_${fila}_${columna}`;
export const idCantidadSip = (tabla: string) => `sip02_${tabla}_cantidad`;

export const GRADOS_SIP02 = [
  { id: "especialidad", titulo: "Especialidad" }, { id: "maestriaPrevia", titulo: "Maestría previa" }, { id: "doctoradoPrevio", titulo: "Doctorado previo" },
];
export const CAMPOS_GRADO_SIP02 = [col("programa", "Programa cursado"), col("institucion", "Institución que lo otorga"), col("incorporada", "Incorporada a (si aplica)"), col("pais", "País"), col("inicio", "Fecha de ingreso (dd/mm/aaaa)"), col("fin", "Fecha de egreso (dd/mm/aaaa)"), col("titulacion", "Forma de titulación"), col("tesis", "Título de la tesis (si aplica)", 300), col("fechaExamen", "Fecha de examen profesional (si aplica)"), col("fechaTitulo", "Fecha del título (si aplica)"), col("cedula", "Número de cédula (si aplica)"), { id: "beca", label: "¿Obtuviste beca para estos estudios?", opciones: ["Sí", "No"] }, col("becaInstitucion", "Institución que otorgó la beca (si aplica)")];
