import type { Respuestas } from "./registro-form";

/**
 * Respuestas de registro de ejemplo (aspirante "María González López").
 * Si el aspirante completó /registro en este navegador, se usan sus respuestas reales
 * (ver useExpediente). Con backend: GET /aspirantes/me.
 */
export const REGISTRO_DEMO: Respuestas = {
  semestre: "B26 (agosto 2026 - enero 2027)",
  programa: "Maestría en Tecnología de Cómputo",
  apellidoPaterno: "González",
  apellidoMaterno: "López",
  nombre: "María",
  curp: "GOLM980412MDFNPR07",
  correo: "maria.gonzalez@correo.mx",
  telefono: "5512345678",
  ultimosEstudios: "Ingeniería en Sistemas Computacionales",
  porQuePrograma: "Quiero especializarme en cómputo de alto desempeño.",
  institucion: "IPN",
  unidadIpn: "ESCOM",
  promedio: "8.7",
  titulado: "Sí",
  opcionTitulacion: "Tesis",
  certificado: "Sí",
  empleos: "Desarrolladora backend en una fintech (2 años): APIs, bases de datos y despliegues en la nube.",
  ultimoPuesto: "Desarrolladora backend",
  investigacion: "Participé en un proyecto de visión por computadora en ESCOM; publicamos un artículo en congreso nacional.",
  interesArea:
    "Me interesa el cómputo porque me permite resolver problemas reales con tecnología, en particular el procesamiento de datos a gran escala.",
  motivoPrograma:
    "El programa de CIDETEC tiene líneas de investigación en procesamiento paralelo y computación inteligente, que se alinean con mi experiencia profesional y con el proyecto que quiero desarrollar.",
  comoAyudara:
    "La maestría me dará las bases de investigación y el acompañamiento de profesores para convertir mi experiencia práctica en contribuciones académicas y, a futuro, continuar con un doctorado.",
  areasInteres: ["Procesamiento Paralelo", "Computación Inteligente", "Redes de Computadoras"],
  estadoCivil: "Soltera",
  // Resto de preguntas abiertas del registro (para el botón "Llenar con datos de ejemplo" de /registro)
  calificacionesRepresentan: "En general sí; en las materias de programación y matemáticas mis calificaciones reflejan bien lo que sé hacer.",
  mayorReto: "Terminar mi tesis de licenciatura mientras trabajaba medio tiempo.",
  habilidadesTrabajo: "Diseño de APIs, optimización de consultas y trabajo con equipos distribuidos.",
  proyectoProfesional: "Sí, un sistema de procesamiento de transacciones en paralelo para reducir tiempos de conciliación.",
  habilidadesTecnicas: "Programación en Python y C++, bases de datos y cómputo en la nube; las aplico a diario en mi trabajo.",
  trabajoEquipo: "Me adapto bien; suelo asumir el rol de coordinar tareas y dar seguimiento a los avances.",
  gestionTiempo: "Divido el proyecto en metas semanales y reviso avances cada viernes.",
  preferenciaTrabajo: "En equipo, porque se enriquecen las ideas, aunque disfruto las tareas individuales de análisis.",
  objetivos5: "Concluir la maestría, publicar al menos dos artículos y continuar con un doctorado.",
  extracurricular: "Voluntariado en talleres de programación para jóvenes.",
  internacional: "Curso de verano en línea sobre cómputo paralelo.",
  extraprofesional: "Corro medio maratón y toco guitarra.",
  habilidadesSocialesFuertes: "Comunicación clara y empatía.",
  habilidadesSocialesFaltan: "Hablar en público ante audiencias grandes.",
  decisiones: "Analizo opciones, consulto a personas con experiencia y decido con base en datos.",
  retoPersonal: "Mudarme sola a la Ciudad de México para estudiar.",
  errorPropio: "Lo reconozco, busco la causa y lo corrijo.",
  errorAjeno: "Lo platico con la persona de forma respetuosa y buscamos una solución.",
  resultadosNoDeseados: "Reviso qué salió mal y ajusto el plan.",
  cambios: "Los tomo como oportunidad para aprender.",
  molestias: "La falta de compromiso en los equipos de trabajo.",
  hijos: "No",
  dependiente: "No",
  opinionFamilia: "Me apoyan y están de acuerdo con que continúe mis estudios.",
  implicaciones: "Dedicar tiempo completo y reorganizar mis horarios personales.",
};

// ---------- Datos que se pueden deducir de la CURP ----------

const ENTIDADES: Record<string, string> = {
  AS: "Aguascalientes", BC: "Baja California", BS: "Baja California Sur", CC: "Campeche",
  CL: "Coahuila", CM: "Colima", CS: "Chiapas", CH: "Chihuahua", DF: "Ciudad de México",
  DG: "Durango", GT: "Guanajuato", GR: "Guerrero", HG: "Hidalgo", JC: "Jalisco",
  MC: "Estado de México", MN: "Michoacán", MS: "Morelos", NT: "Nayarit", NL: "Nuevo León",
  OC: "Oaxaca", PL: "Puebla", QT: "Querétaro", QR: "Quintana Roo", SP: "San Luis Potosí",
  SL: "Sinaloa", SR: "Sonora", TC: "Tabasco", TS: "Tamaulipas", TL: "Tlaxcala",
  VZ: "Veracruz", YN: "Yucatán", ZS: "Zacatecas", NE: "Nacido en el extranjero",
};

const valida = (curp?: string) => (curp && /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp) ? curp : null);

export function fechaNacimientoDeCurp(curp?: string): string | undefined {
  const c = valida(curp);
  if (!c) return;
  const [yy, mm, dd] = [c.slice(4, 6), c.slice(6, 8), c.slice(8, 10)];
  // Posición 17: dígito → nacido antes de 2000, letra → 2000 en adelante
  const siglo = /\d/.test(c[16]) ? "19" : "20";
  return `${dd}/${mm}/${siglo}${yy}`;
}

export const sexoDeCurp = (curp?: string) => {
  const c = valida(curp);
  return c ? (c[10] === "M" ? "F" : "M") : undefined; // CURP usa H/M; los formatos SIP usan F/M
};

export const entidadDeCurp = (curp?: string) => {
  const c = valida(curp);
  return c ? ENTIDADES[c.slice(11, 13)] : undefined;
};

/** Los primeros 10 caracteres del RFC coinciden con la CURP; falta la homoclave. */
export const rfcBaseDeCurp = (curp?: string) => valida(curp)?.slice(0, 10);

export const nombreCompleto = (r: Respuestas) =>
  [r.nombre, r.apellidoPaterno, r.apellidoMaterno].filter(Boolean).join(" ");

/**
 * Solo cascarón: valores de ejemplo para completar los datos que el registro no pide
 * (botón "Llenar con datos de ejemplo" en cada formato).
 */
export const CAPTURAS_DEMO: Record<string, string | string[]> = {
  estatus: "Tiempo completo",
  calle: "Av. Instituto Politécnico Nacional",
  numExt: "2580",
  numInt: "4B",
  colonia: "La Laguna Ticomán",
  alcaldia: "Gustavo A. Madero",
  cp: "07340",
  estadoDom: "Ciudad de México",
  telCasa: "5557296000",
  licFecha: "15/07/2021",
  licEstado: "Ciudad de México",
  licIngreso: "15/08/2016",
  licEgreso: "30/06/2021",
  fechaExamen: "10/07/2021",
  cedula: "13579246",
  rfc: "GOLM980412AB3",
  empresa: "Fintech Soluciones S.A. de C.V.",
  empleoInicio: "01/08/2022",
  inglesHabilidades: ["Comprensión de lectura", "Expresión oral"],
  inglesAval: "Sí",
  avisoPrivacidad: "Acepto",
  becaSecihti: "Sí",
  sinBeca: "Sí",
  profesorInteres: "No",
  horario: "Matutino",
  ingles2: "Sí",
  inglesSituacion: "Constancia CENLEX B1",
  argumentacion:
    "Puedo dedicarme de tiempo completo al programa y aportar mi experiencia profesional en desarrollo de software y cómputo en la nube al trabajo de investigación.",
};
