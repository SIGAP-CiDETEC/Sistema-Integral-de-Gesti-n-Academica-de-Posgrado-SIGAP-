import { PROGRAMA } from "./config";

/**
 * Definición del formulario de registro inicial (CU-ADM-01 / RF-01).
 * Basado en el Forms "Entrevista Colegiada de Admisión".
 *
 * Para agregar, quitar o editar preguntas solo se modifica este archivo:
 * el formulario se dibuja y valida a partir de estos datos.
 */

export type TipoCampo = "fijo" | "text" | "textarea" | "email" | "tel" | "select" | "radio" | "checkbox";

export type Respuestas = Record<string, string | string[]>;

export type Pregunta = {
  id: string;
  label: string;
  tipo: TipoCampo;
  requerido?: boolean;
  opciones?: string[];
  /** Para tipo "fijo": valor que no puede cambiar el aspirante */
  valorFijo?: string;
  placeholder?: string;
  ayuda?: string;
  /** Validación adicional: devuelve el mensaje de error o null */
  validar?: (valor: string) => string | null;
  /** Solo se muestra (y se valida) si esta condición se cumple */
  mostrarSi?: (r: Respuestas) => boolean;
  /** Ocupa las dos columnas en pantallas grandes */
  ancho?: "completo";
};

export type Seccion = { id: string; titulo: string; descripcion?: string; preguntas: Pregunta[] };

// ---------- Catálogos (reemplazar por los de la BD cuando exista el backend) ----------

export const SEMESTRES = ["B26 (agosto 2026 - enero 2027)"];

export const UNIDADES_IPN = [
  "ESCOM",
  "ESIME Zacatenco",
  "ESIME Culhuacán",
  "ESIME Azcapotzalco",
  "UPIITA",
  "UPIICSA",
  "ESFM",
  "CIC",
  "CIDETEC",
  "Otra unidad del IPN",
];

export const AREAS_INVESTIGACION = [
  "Procesamiento Paralelo",
  "Mecatrónica",
  "Seguridad Informática",
  "Computación Inteligente",
  "Realidad Virtual",
  "Redes de Computadoras",
];

// ---------- Validaciones ----------

const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarCurp = (v: string) =>
  CURP_RE.test(v.trim().toUpperCase()) ? null : "La CURP debe tener 18 caracteres con el formato oficial.";
const validarEmail = (v: string) => (EMAIL_RE.test(v.trim()) ? null : "Ingresa un correo válido.");
const validarTelefono = (v: string) =>
  /^\d{10}$/.test(v.replace(/\s|-/g, "")) ? null : "El teléfono debe tener 10 dígitos.";
const validarPromedio = (v: string) => {
  const n = Number(v);
  return !Number.isNaN(n) && n >= 6 && n <= 10 ? null : "Ingresa un promedio entre 6.0 y 10.0.";
};

// ---------- Secciones ----------

export const SECCIONES: Seccion[] = [
  {
    id: "personales",
    titulo: "Datos personales",
    descripcion: "Utiliza mayúsculas, minúsculas y acentos tal como aparecen en tus documentos oficiales.",
    preguntas: [
      { id: "semestre", label: "Semestre a ingresar", tipo: "radio", requerido: true, opciones: SEMESTRES, ancho: "completo" },
      { id: "programa", label: "Programa solicitado", tipo: "fijo", valorFijo: PROGRAMA, ancho: "completo" },
      { id: "apellidoPaterno", label: "Apellido paterno", tipo: "text", requerido: true },
      { id: "apellidoMaterno", label: "Apellido materno", tipo: "text", requerido: true },
      { id: "nombre", label: "Nombre(s)", tipo: "text", requerido: true },
      {
        id: "curp",
        label: "CURP",
        tipo: "text",
        requerido: true,
        placeholder: "18 caracteres",
        validar: validarCurp,
        ayuda: "Se usa para detectar registros duplicados.",
      },
      {
        id: "correo",
        label: "Correo electrónico",
        tipo: "email",
        requerido: true,
        placeholder: "correo@ejemplo.com",
        ayuda: "Ingresa el de uso frecuente. Ahí recibirás tu ID temporal.",
        validar: validarEmail,
      },
      {
        id: "telefono",
        label: "Teléfono",
        tipo: "tel",
        requerido: true,
        placeholder: "10 dígitos",
        ayuda: "Ingresa el de uso frecuente.",
        validar: validarTelefono,
      },
    ],
  },
  {
    id: "academica",
    titulo: "Formación académica",
    preguntas: [
      { id: "ultimosEstudios", label: "Últimos estudios realizados", tipo: "text", requerido: true },
      { id: "porQuePrograma", label: "¿Por qué elegiste el programa?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "institucion", label: "Institución académica de procedencia", tipo: "radio", requerido: true, opciones: ["IPN", "UNAM", "UAM", "Otros"] },
      {
        id: "unidadIpn",
        label: "Selecciona el nombre de tu Unidad Académica",
        tipo: "select",
        requerido: true,
        opciones: UNIDADES_IPN,
        mostrarSi: (r) => r.institucion === "IPN",
      },
      {
        id: "unidadNombre",
        label: "Nombre de la Unidad Académica de tu institución",
        tipo: "text",
        requerido: true,
        ayuda: "Nombre completo, sin abreviaturas.",
        mostrarSi: (r) => !!r.institucion && (r.institucion !== "IPN" || r.unidadIpn === "Otra unidad del IPN"),
      },
      {
        id: "promedio",
        label: "¿Cuál fue el promedio que obtuviste?",
        tipo: "text",
        requerido: true,
        placeholder: "Ej. 8.7",
        ayuda: "Conforme lo establece tu certificado de estudios.",
        validar: validarPromedio,
      },
      { id: "calificacionesRepresentan", label: "¿Crees que tus calificaciones representan adecuadamente tus habilidades?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "titulado", label: "¿Estás titulado?", tipo: "radio", requerido: true, opciones: ["Sí", "No"] },
      { id: "opcionTitulacion", label: "¿Por cuál opción lo realizaste?", tipo: "text", requerido: true, mostrarSi: (r) => r.titulado === "Sí" },
      { id: "causaNoTitulado", label: "¿Cuál es la causa?", tipo: "text", requerido: true, mostrarSi: (r) => r.titulado === "No" },
      { id: "certificado", label: "¿Tienes certificado de conclusión de estudios?", tipo: "radio", requerido: true, opciones: ["Sí", "No"] },
      { id: "causaNoCertificado", label: "¿Cuál es la causa?", tipo: "text", requerido: true, mostrarSi: (r) => r.certificado === "No" },
      { id: "mayorReto", label: "Menciona el mayor reto académico al que te enfrentaste durante tu formación", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "investigacion", label: "¿Has participado en proyectos de investigación o publicaciones académicas? Describe tu experiencia", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "profesional",
    titulo: "Experiencia profesional",
    preguntas: [
      { id: "empleos", label: "Escribe un poco sobre los empleos que has tenido", ayuda: "Tipo de organización, área, puestos, responsabilidades y tiempo en cada uno.", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "ultimoPuesto", label: "¿Cuál ha sido el último puesto desempeñado?", tipo: "text", requerido: true, ancho: "completo" },
      { id: "habilidadesTrabajo", label: "¿Qué habilidades específicas has desarrollado en tus trabajos que consideras relevantes para este programa?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "proyectoProfesional", label: "¿Tienes o tuviste algún proyecto profesional relacionado con las áreas de este programa? De ser afirmativo, descríbelo brevemente", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "habilidades",
    titulo: "Habilidades y competencias",
    preguntas: [
      { id: "habilidadesTecnicas", label: "¿Qué habilidades técnicas consideras tus puntos fuertes y cómo las has aplicado en situaciones prácticas?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "trabajoEquipo", label: "¿Cómo manejas el trabajo en equipo y qué rol sueles asumir en proyectos grupales?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "gestionTiempo", label: "¿Cómo organizas y gestionas tu tiempo cuando trabajas en un proyecto individual?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "preferenciaTrabajo", label: "¿Qué forma de trabajo prefieres: individual o en equipo? ¿Por qué?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "motivos",
    titulo: "Motivos de la solicitud de ingreso",
    preguntas: [
      { id: "interesArea", label: "¿Por qué te interesa estudiar el área de Tecnología (Ingeniería) de Cómputo?", tipo: "textarea", requerido: true, ancho: "completo" },
      {
        id: "comoTeEnteraste",
        label: "¿Cómo te enteraste del programa?",
        tipo: "select",
        opciones: ["Correo institucional", "Redes sociales", "Página web del Centro", "Profesor Colegiado del Centro", "Feria de Posgrado", "Medio impreso", "Recomendación", "Otra"],
      },
      { id: "comoTeEnterasteOtra", label: "¿Cuál?", tipo: "text", requerido: true, mostrarSi: (r) => r.comoTeEnteraste === "Otra" },
      { id: "motivoPrograma", label: "¿Qué te motivó a elegir este programa en particular?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "areasInteres", label: "¿Cuál o cuáles son las áreas de investigación que despiertan tu interés?", tipo: "checkbox", requerido: true, opciones: AREAS_INVESTIGACION, ancho: "completo" },
    ],
  },
  {
    id: "objetivos",
    titulo: "Proyectos y objetivos",
    preguntas: [
      { id: "objetivos5", label: "¿Cuáles son tus objetivos profesionales y académicos en los próximos 5 años?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "comoAyudara", label: "¿Cómo crees que este programa te ayudará a alcanzar tus objetivos?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "extracurriculares",
    titulo: "Intereses y actividades extracurriculares",
    preguntas: [
      { id: "extracurricular", label: "¿Participas o participaste en alguna actividad extracurricular relevante para tu desarrollo académico o profesional?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "internacional", label: "¿Has tenido alguna experiencia internacional o intercultural que haya influido en tu perspectiva académica o profesional?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "extraprofesional", label: "¿Participas en alguna actividad extraprofesional (política, sindical, cultural, deportiva, artística, comunitaria, etc.)?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "personalidad",
    titulo: "Personalidad",
    preguntas: [
      { id: "habilidadesSocialesFuertes", label: "¿Qué habilidades sociales consideras puntos fuertes de tu personalidad y cómo las aplicas en tu vida diaria?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "habilidadesSocialesFaltan", label: "¿Qué habilidades sociales consideras que te faltan por desarrollar?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "decisiones", label: "Cuando tienes que tomar una decisión, ¿cómo actúas generalmente?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "retoPersonal", label: "¿Cuál ha sido el reto personal más grande de tu vida?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "errorPropio", label: "Si cometes algún error, ¿cómo manejas la situación?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "errorAjeno", label: "Si alguien comete un error y resultas afectado, ¿cómo manejas la situación?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "resultadosNoDeseados", label: "Cuando no obtienes los resultados deseados, ¿cuál es tu reacción?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "cambios", label: "¿Cómo actúas ante los cambios o imprevistos?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "molestias", label: "¿Cuáles son las cosas que más te molestan?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
  {
    id: "familiar",
    titulo: "Situación personal y familiar",
    preguntas: [
      { id: "estadoCivil", label: "¿Cuál es tu estado civil?", tipo: "text", requerido: true },
      { id: "hijos", label: "¿Tienes hijos? ¿Cuántos?", tipo: "text", requerido: true },
      { id: "dependiente", label: "¿Tienes algún dependiente económico?", tipo: "text", requerido: true, ancho: "completo" },
      { id: "opinionFamilia", label: "¿Qué piensa tu familia de que ingreses al posgrado?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "implicaciones", label: "¿Has pensado en las implicaciones que conlleva estudiar un posgrado?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
];

// ---------- Utilidades ----------

/** Respuestas que siempre llevan el mismo valor (campos tipo "fijo"). */
export const VALORES_FIJOS: Respuestas = Object.fromEntries(
  SECCIONES.flatMap((s) => s.preguntas)
    .filter((p) => p.tipo === "fijo" && p.valorFijo)
    .map((p) => [p.id, p.valorFijo as string]),
);

export const esVisible = (p: Pregunta, r: Respuestas) => (p.mostrarSi ? p.mostrarSi(r) : true);

/** Devuelve { idPregunta: mensaje } con los errores de una sección. */
export function validarSeccion(seccion: Seccion, r: Respuestas): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const p of seccion.preguntas) {
    if (!esVisible(p, r) || p.tipo === "fijo") continue;
    const valor = r[p.id];
    const vacio = Array.isArray(valor) ? valor.length === 0 : !valor || !String(valor).trim();
    if (vacio) {
      if (p.requerido) errores[p.id] = p.tipo === "checkbox" ? "Selecciona al menos una opción." : "Este campo es obligatorio.";
      continue;
    }
    if (p.validar && typeof valor === "string") {
      const msg = p.validar(valor);
      if (msg) errores[p.id] = msg;
    }
  }
  return errores;
}

/** CURPs ya registradas (mock) para simular la alerta de "posible registro duplicado". */
export const CURPS_REGISTRADAS = ["MALA980412MDFRPN08"];
