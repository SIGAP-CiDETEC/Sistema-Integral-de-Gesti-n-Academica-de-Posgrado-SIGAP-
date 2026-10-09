import { PROGRAMA } from "./config";
import { TABLAS_SIP02, idCantidadSip, idCeldaSip, GRADOS_SIP02, CAMPOS_GRADO_SIP02 } from "./sip02-secciones";

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
  ordenable?: boolean;
  maxOpciones?: number;
  minOpciones?: number;
  maxLength?: number;
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

/** Semestres de ingreso; en el registro solo se ofrecen los de convocatorias abiertas (ver RegistroWizard). */
export const SEMESTRES = ["A27 (enero – junio 2027)", "B27 (agosto – diciembre 2027)"];

/**
 * Unidades académicas del IPN (nivel superior y centros de investigación), según ipn.mx
 * (oferta educativa de nivel superior y mapa de unidades 2025). Formato: "SIGLAS — Nombre oficial".
 */
export const UNIDADES_IPN = [
  "CICS Milpa Alta — Centro Interdisciplinario de Ciencias de la Salud, Unidad Milpa Alta",
  "CICS Santo Tomás — Centro Interdisciplinario de Ciencias de la Salud, Unidad Santo Tomás",
  "ENBA — Escuela Nacional de Biblioteconomía y Archivonomía",
  "ENCB Santo Tomás — Escuela Nacional de Ciencias Biológicas, Unidad Santo Tomás",
  "ENCB Zacatenco — Escuela Nacional de Ciencias Biológicas, Unidad Zacatenco",
  "ENMyH — Escuela Nacional de Medicina y Homeopatía",
  "ESCA Santo Tomás — Escuela Superior de Comercio y Administración, Unidad Santo Tomás",
  "ESCA Tepepan — Escuela Superior de Comercio y Administración, Unidad Tepepan",
  "ESCOM — Escuela Superior de Cómputo",
  "ESE — Escuela Superior de Economía",
  "ESEO — Escuela Superior de Enfermería y Obstetricia",
  "ESFM — Escuela Superior de Física y Matemáticas",
  "ESIA Tecamachalco — Escuela Superior de Ingeniería y Arquitectura, Unidad Tecamachalco",
  "ESIA Ticomán — Escuela Superior de Ingeniería y Arquitectura, Unidad Ticomán",
  "ESIA Zacatenco — Escuela Superior de Ingeniería y Arquitectura, Unidad Zacatenco",
  "ESIME Azcapotzalco — Escuela Superior de Ingeniería Mecánica y Eléctrica, Unidad Azcapotzalco",
  "ESIME Culhuacán — Escuela Superior de Ingeniería Mecánica y Eléctrica, Unidad Culhuacán",
  "ESIME Ticomán — Escuela Superior de Ingeniería Mecánica y Eléctrica, Unidad Ticomán",
  "ESIME Zacatenco — Escuela Superior de Ingeniería Mecánica y Eléctrica, Unidad Zacatenco",
  "ESIQIE — Escuela Superior de Ingeniería Química e Industrias Extractivas",
  "ESIT — Escuela Superior de Ingeniería Textil",
  "ESM — Escuela Superior de Medicina",
  "EST — Escuela Superior de Turismo",
  "UPIBI — Unidad Profesional Interdisciplinaria de Biotecnología",
  "UPIEM — Unidad Profesional Interdisciplinaria de Energía y Movilidad",
  "UPIIAP — Unidad Profesional Interdisciplinaria de Ingeniería \"Alejo Peralta\", Campus Puebla",
  "UPIIC — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Coahuila",
  "UPIICSA — Unidad Profesional Interdisciplinaria de Ingeniería y Ciencias Sociales y Administrativas",
  "UPIIG — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Guanajuato",
  "UPIIH — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Hidalgo",
  "UPIIP — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Palenque",
  "UPIIT — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Tlaxcala",
  "UPIITA — Unidad Profesional Interdisciplinaria en Ingeniería y Tecnologías Avanzadas",
  "UPIIZ — Unidad Profesional Interdisciplinaria de Ingeniería, Campus Zacatecas",
  // Centros de investigación y posgrado
  "CBG — Centro de Biotecnología Genómica",
  "CDA — Centro de Desarrollo Aeroespacial",
  "CEPROBI — Centro de Desarrollo de Productos Bióticos",
  "CIBA Tlaxcala — Centro de Investigación en Biotecnología Aplicada, Unidad Tlaxcala",
  "CIC — Centro de Investigación en Computación",
  "CICATA Altamira — Centro de Investigación en Ciencia Aplicada y Tecnología Avanzada, Unidad Altamira",
  "CICATA Legaria — Centro de Investigación en Ciencia Aplicada y Tecnología Avanzada, Unidad Legaria",
  "CICATA Morelos — Centro de Investigación en Ciencia Aplicada y Tecnología Avanzada, Unidad Morelos",
  "CICATA Querétaro — Centro de Investigación en Ciencia Aplicada y Tecnología Avanzada, Unidad Querétaro",
  "CICIMAR — Centro Interdisciplinario de Ciencias Marinas",
  "CIDETEC — Centro de Innovación y Desarrollo Tecnológico en Cómputo",
  "CIECAS — Centro de Investigaciones Económicas, Administrativas y Sociales",
  "CIIDIR Durango — Centro Interdisciplinario de Investigación para el Desarrollo Integral Regional, Unidad Durango",
  "CIIDIR Michoacán — Centro Interdisciplinario de Investigación para el Desarrollo Integral Regional, Unidad Michoacán",
  "CIIDIR Oaxaca — Centro Interdisciplinario de Investigación para el Desarrollo Integral Regional, Unidad Oaxaca",
  "CIIDIR Sinaloa — Centro Interdisciplinario de Investigación para el Desarrollo Integral Regional, Unidad Sinaloa",
  "CIIEMAD — Centro Interdisciplinario de Investigaciones y Estudios sobre Medio Ambiente y Desarrollo",
  "CIITEC — Centro de Investigación e Innovación Tecnológica",
  "CITEDI — Centro de Investigación y Desarrollo de Tecnología Digital",
  "CMP+L — Centro Mexicano para la Producción más Limpia",
  "CNMN — Centro de Nanociencias y Micro y Nanotecnologías",
  "Otra unidad del IPN",
];

/** "ESCOM — Escuela Superior de Cómputo" → siglas ("ESCOM") y nombre ("Escuela Superior de Cómputo"). */
export const siglasUnidad = (v: string) => v.split(" — ")[0];
export const nombreUnidad = (v: string) => v.split(" — ")[1] ?? v;

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
      { id: "genero", label: "Género", tipo: "radio", requerido: true, opciones: ["Masculino", "Femenino"] },
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
      { id: "tieneExperienciaProfesional", label: "¿Tienes experiencia profesional?", tipo: "radio", requerido: true, opciones: ["Sí", "No"], ancho: "completo" },
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
      { id: "areasInteres", label: "¿Cuál o cuáles son las áreas de investigación que despiertan tu interés?", tipo: "checkbox", requerido: true, ordenable: true, maxOpciones: 3, ayuda: "Selecciona hasta 3 áreas y ordénalas de mayor a menor interés usando Subir y Bajar. La primera será tu prioridad.", opciones: AREAS_INVESTIGACION, ancho: "completo" },
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
      { id: "estadoCivil", label: "¿Cuál es tu estado civil?", tipo: "radio", requerido: true, opciones: ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Unión libre", "Viudo(a)"] },
      { id: "hijos", label: "¿Tienes hijos? ¿Cuántos?", tipo: "text", requerido: true },
      { id: "dependiente", label: "¿Tienes algún dependiente económico?", tipo: "text", requerido: true, ancho: "completo" },
      { id: "opinionFamilia", label: "¿Qué piensa tu familia de que ingreses al posgrado?", tipo: "textarea", requerido: true, ancho: "completo" },
      { id: "implicaciones", label: "¿Has pensado en las implicaciones que conlleva estudiar un posgrado?", tipo: "textarea", requerido: true, ancho: "completo" },
    ],
  },
];

// Información adicional necesaria para entregar el SIP-02 ya llenado.
const validarFechaSip = (v: string) => {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!partes) return "Usa el formato dd/mm/aaaa.";
  const [, dia, mes, anio] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return fecha.getFullYear() === Number(anio) && fecha.getMonth() === Number(mes) - 1 && fecha.getDate() === Number(dia) ? null : "Ingresa una fecha válida.";
};
const fechaSip = (id: string, label: string, mostrarSi?: Pregunta["mostrarSi"]): Pregunta => ({ id, label, tipo: "text", requerido: true, placeholder: "dd/mm/aaaa", validar: validarFechaSip, mostrarSi });
SECCIONES.push({
  id: "curriculum",
  titulo: "Datos para tu currículum SIP-02",
  descripcion: "Tu nombre, CURP, datos de contacto, formación y experiencia ya se toman de las respuestas anteriores. Completa aquí los datos adicionales para recibir el formato lleno.",
  preguntas: [
    { id: "rfc", label: "RFC con homoclave", tipo: "text", requerido: true, maxLength: 13, validar: (v) => /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(v.trim().toUpperCase()) ? null : "Ingresa un RFC de 13 caracteres, incluida la homoclave." },
    { id: "nacionalidad", label: "Nacionalidad", tipo: "text", requerido: true },
    { id: "lugarNacimiento", label: "Estado y país de nacimiento", tipo: "text", requerido: true },
    { id: "calle", label: "Calle del domicilio", tipo: "text", requerido: true },
    { id: "numExt", label: "Número exterior", tipo: "text", requerido: true, ayuda: "Si no tiene número, escribe S/N." },
    { id: "numInt", label: "Número interior (si aplica)", tipo: "text" },
    { id: "colonia", label: "Colonia", tipo: "text", requerido: true },
    { id: "alcaldia", label: "Alcaldía o municipio", tipo: "text", requerido: true },
    { id: "cp", label: "Código postal", tipo: "text", requerido: true, maxLength: 5, validar: (v) => /^\d{5}$/.test(v) ? null : "Ingresa 5 dígitos." },
    { id: "estadoDom", label: "Estado del domicilio", tipo: "text", requerido: true },
    { id: "pais", label: "País del domicilio", tipo: "text", requerido: true },
    { id: "telCasa", label: "Teléfono de casa (opcional)", tipo: "tel", validar: validarTelefono },
    { id: "correo2", label: "Correo electrónico alternativo (opcional)", tipo: "email", validar: validarEmail },
    { id: "empresa", label: "Empresa del empleo actual o último", tipo: "text", requerido: true, mostrarSi: (r) => r.tieneExperienciaProfesional === "Sí" },
    fechaSip("empleoInicio", "Fecha de inicio del empleo", (r) => r.tieneExperienciaProfesional === "Sí"),
    { id: "empleoVigente", label: "¿Continúas en ese empleo?", tipo: "radio", requerido: true, opciones: ["Sí", "No"], mostrarSi: (r) => r.tieneExperienciaProfesional === "Sí" },
    fechaSip("empleoFin", "Fecha de término del empleo", (r) => r.tieneExperienciaProfesional === "Sí" && r.empleoVigente === "No"),
    { id: "experiencia", label: "Resumen de las principales funciones del empleo para el SIP-02", tipo: "textarea", requerido: true, maxLength: 160, ayuda: "Hasta 160 caracteres para el espacio del formato oficial.", ancho: "completo", mostrarSi: (r) => r.tieneExperienciaProfesional === "Sí" },
    { id: "licPais", label: "País de la institución de licenciatura", tipo: "text", requerido: true },
    fechaSip("licIngreso", "Fecha de ingreso a la licenciatura"),
    fechaSip("licEgreso", "Fecha de egreso de la licenciatura"),
    fechaSip("licFecha", "Fecha de expedición del título", (r) => r.titulado === "Sí"),
    { ...fechaSip("fechaExamen", "Fecha de examen profesional (si aplica)", (r) => r.titulado === "Sí"), requerido: false },
    { id: "cedula", label: "Número de cédula profesional (si ya la tienes)", tipo: "text", mostrarSi: (r) => r.titulado === "Sí" },
    { id: "inglesHabilidades", label: "Habilidades de inglés acreditadas", tipo: "checkbox", requerido: true, minOpciones: 2, opciones: ["Comprensión de lectura", "Comprensión auditiva", "Expresión escrita", "Expresión oral"], ayuda: "Selecciona al menos dos habilidades acreditadas en tu constancia.", ancho: "completo" },
    { id: "inglesAval", label: "¿Tu constancia tiene aval de la DFLE o es de CELEX/CENLEX?", tipo: "radio", requerido: true, opciones: ["Sí", "No"], ancho: "completo" },
  ],
});

// ---------- Utilidades ----------
SECCIONES.push({
  id: "sip02EmpleoFormacion",
  titulo: "SIP-02: empleo y formación académica adicional",
  preguntas: [
    ...["empleoDomicilio", "empleoTelefono", "jefeNombre", "jefeTelefono"].map((id, i): Pregunta => ({ id, label: ["Domicilio de la empresa", "Teléfono de la empresa", "Nombre del jefe inmediato", "Teléfono del jefe inmediato"][i], tipo: "text", mostrarSi: (r) => r.tieneExperienciaProfesional === "Sí" })),
    { id: "licIncorporada", label: "Licenciatura: institución a la que está incorporada (si aplica)", tipo: "text" },
    { id: "licTesis", label: "Título de la tesis de licenciatura (si aplica)", tipo: "text" },
    { id: "licBeca", label: "¿Obtuviste beca durante la licenciatura? (opcional)", tipo: "radio", opciones: ["Sí", "No"] },
    { id: "licBecaInstitucion", label: "Institución que otorgó la beca de licenciatura", tipo: "text", mostrarSi: (r) => r.licBeca === "Sí" },
    ...GRADOS_SIP02.flatMap((grado): Pregunta[] => [
      { id: `sip02_${grado.id}_aplica`, label: `¿Cursaste una ${grado.titulo.toLowerCase()}?`, tipo: "radio", opciones: ["Sí", "No"], ayuda: "Opcional. Selecciona No si no aplica." },
      ...CAMPOS_GRADO_SIP02.map((c): Pregunta => ({ id: idCeldaSip(grado.id, 0, c.id), label: `${grado.titulo}: ${c.label}`, tipo: c.opciones ? "radio" : "text", opciones: c.opciones, maxLength: c.maxLength, mostrarSi: (r) => r[`sip02_${grado.id}_aplica`] === "Sí", validar: c.label.includes("(dd/mm/aaaa)") ? validarFechaSip : undefined })),
    ]),
  ],
});
SECCIONES.push(...TABLAS_SIP02.map((tabla): Seccion => ({
  id: `sip02_${tabla.id}`,
  titulo: tabla.titulo,
  descripcion: `Sección opcional. Selecciona 0 si no tienes registros. Puedes capturar hasta ${tabla.max}, como en el formato oficial.`,
  preguntas: [
    { id: idCantidadSip(tabla.id), label: "¿Cuántos registros deseas incluir?", tipo: "select", opciones: Array.from({ length: tabla.max + 1 }, (_, i) => String(i)), ancho: "completo" },
    ...Array.from({ length: tabla.max }, (_, fila) => tabla.columnas.map((c): Pregunta => ({
      id: idCeldaSip(tabla.id, fila, c.id), label: `Registro ${fila + 1}: ${c.label}`, tipo: c.opciones ? "radio" : "text", opciones: c.opciones,
      maxLength: c.maxLength, mostrarSi: (r) => Number(r[idCantidadSip(tabla.id)] ?? 0) > fila,
      validar: c.label.includes("(dd/mm/aaaa)") ? validarFechaSip : c.id === "anio" ? (v) => /^\d{4}$/.test(v) ? null : "Ingresa el año con 4 dígitos." : undefined,
    }))).flat(),
  ],
})));
SECCIONES.push({ id: "sip02Adicional", titulo: "XIV. Información adicional relevante", descripcion: "Opcional. Agrega información que no aparezca en las secciones anteriores.", preguntas: [{ id: "sip02Adicional", label: "Información adicional relevante para tu currículum", tipo: "textarea", ancho: "completo" }] });

/** Respuestas que siempre llevan el mismo valor (campos tipo "fijo"). */
export const VALORES_FIJOS: Respuestas = Object.fromEntries(
  SECCIONES.flatMap((s) => s.preguntas)
    .filter((p) => p.tipo === "fijo" && p.valorFijo)
    .map((p) => [p.id, p.valorFijo as string]),
);

export const esVisible = (p: Pregunta, r: Respuestas) => {
  if (["empleos", "ultimoPuesto", "habilidadesTrabajo", "proyectoProfesional"].includes(p.id) && r.tieneExperienciaProfesional !== "Sí") return false;
  return p.mostrarSi ? p.mostrarSi(r) : true;
};

/** Devuelve { idPregunta: mensaje } con los errores de una sección. */
export function validarSeccion(seccion: Seccion, r: Respuestas): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const p of seccion.preguntas) {
    if (!esVisible(p, r) || p.tipo === "fijo") continue;
    const valor = r[p.id];
    if (Array.isArray(valor) && p.minOpciones && valor.length < p.minOpciones) {
      errores[p.id] = `Selecciona al menos ${p.minOpciones} opciones.`;
      continue;
    }
    if (typeof valor === "string" && p.maxLength && valor.length > p.maxLength) {
      errores[p.id] = `Usa como máximo ${p.maxLength} caracteres.`;
      continue;
    }
    if (Array.isArray(valor) && p.maxOpciones && valor.length > p.maxOpciones) {
      errores[p.id] = `Selecciona como máximo ${p.maxOpciones} opciones.`;
      continue;
    }
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
