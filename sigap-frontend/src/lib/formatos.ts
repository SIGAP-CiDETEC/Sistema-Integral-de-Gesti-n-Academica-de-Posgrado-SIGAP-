import {
  entidadDeCurp,
  fechaNacimientoDeCurp,
  nombreCompleto,
  rfcBaseDeCurp,
  sexoDeCurp,
} from "./aspirante-datos";
import type { EtapaId } from "./admision";
import { PROGRAMA_INDIVIDUAL_DEMO, nombreAsesor } from "./programa-individual";
import { AREAS_INVESTIGACION, type Respuestas } from "./registro-form";

/**
 * Formatos oficiales que el SISTEMA LLENA con los datos del aspirante.
 * El aspirante solo completa lo que falte, descarga el PDF ya lleno, lo firma a mano
 * y sube el escaneo; ese PDF firmado le llega al departamento que corresponde (`destino`).
 *
 * Los valores capturados se comparten entre formatos por `id` (p. ej. el domicilio
 * capturado en el SIP-02 aparece solo en el SIP-01).
 */

export type Valor = string | string[];
export type Capturas = Record<string, Valor>;

export type Contexto = {
  /** Respuestas del registro inicial */
  r: Respuestas;
  /** Datos ya capturados en cualquier formato */
  c: Capturas;
  hoy: Date;
};

export type CampoFormato = {
  id: string;
  label: string;
  tipo: "text" | "textarea" | "radio" | "ranking" | "multi";
  opciones?: string[];
  /** Valor sugerido a partir del registro u otros datos */
  auto?: (ctx: Contexto) => Valor | undefined;
  /** Por defecto es obligatorio */
  opcional?: boolean;
  /** Lo pone el sistema (fecha, unidad académica…); no se edita */
  sistema?: boolean;
  mostrarSi?: (v: (id: string) => Valor | undefined) => boolean;
  ayuda?: string;
  maxLength?: number;
  seccion?: string;
  /** Validación extra: si devuelve false, el campo cuenta como "falta" */
  valido?: (v: string) => boolean;
};

export type Rol = "aspirante" | "asesor" | "jefe" | "sinodo" | "comision";

export type Firma = {
  rol: Rol;
  label: string;
  /** No se muestra al aspirante (p. ej. firmas del sínodo el día de la entrevista) */
  ocultaAspirante?: boolean;
};

export type Formato = {
  clave: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  fase: EtapaId;
  /** Quién captura el formato */
  /** Quién lo llena: el aspirante, un área de CIDETEC (lo emite) o el asesor */
  llena: "aspirante" | "area" | "asesor";
  /** Archivo en /public/formatos */
  plantilla: string | null;
  /** Estado de la generación del PDF */
  pdf: "listo" | "falta-plantilla" | "pendiente";
  notaPlantilla?: string;
  campos: CampoFormato[];
  firmas: Firma[];
  /** Texto para lo que captura otra persona (ej. programa semestral del asesor) */
  capturaOtros?: string;
  /** Departamento que recibe el PDF firmado */
  destino: string;
  /** El aspirante solo revisa sus datos y los confirma; el documento lo emite y firma otra área */
  confirmaAspirante?: boolean;
  /** Páginas (base 0) que ve y descarga el aspirante; el resto lo llena otra persona */
  paginasAspirante?: number[];
};

// ---------- Utilidades de valores automáticos ----------

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const fechaLarga = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
export const partesFecha = (d: Date) => ({ dia: String(d.getDate()), mes: MESES[d.getMonth()], anio: String(d.getFullYear()) });

const str = (v: Valor | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");

const unidadProcedencia = (r: Respuestas) =>
  r.institucion === "IPN" && r.unidadIpn && r.unidadIpn !== "Otra unidad del IPN"
    ? `IPN — ${r.unidadIpn}`
    : [r.institucion === "Otros" ? "" : str(r.institucion), str(r.unidadNombre)].filter(Boolean).join(" — ");

const estadoCivilSip = (txt: string) => {
  const t = txt.toLowerCase();
  if (t.startsWith("solter")) return "Soltero(a)";
  if (t.startsWith("casad")) return "Casado(a)";
  if (t.startsWith("divorc")) return "Divorciado(a)";
  if (t.includes("unión") || t.includes("union")) return "Unión libre";
  if (t.startsWith("viud")) return "Viudo(a)";
  return undefined;
};

const UNIDAD = "Centro de Innovación y Desarrollo Tecnológico en Cómputo";

// ---------- Campos reutilizados entre formatos ----------

const C = {
  fecha: { id: "fecha", label: "Fecha", tipo: "text", sistema: true, auto: ({ hoy }) => fechaLarga(hoy) },
  apellidoPaterno: { id: "apellidoPaterno", label: "Apellido paterno", tipo: "text", auto: ({ r }) => str(r.apellidoPaterno) },
  apellidoMaterno: { id: "apellidoMaterno", label: "Apellido materno", tipo: "text", auto: ({ r }) => str(r.apellidoMaterno) },
  nombre: { id: "nombre", label: "Nombre(s)", tipo: "text", auto: ({ r }) => str(r.nombre) },
  nombreCompleto: { id: "nombreCompleto", label: "Nombre completo", tipo: "text", auto: ({ r }) => nombreCompleto(r) },
  programa: { id: "programa", label: "Programa académico de posgrado", tipo: "text", sistema: true, auto: ({ r }) => str(r.programa) },
  unidad: { id: "unidadAcademica", label: "Unidad académica", tipo: "text", sistema: true, auto: () => UNIDAD },
  estatus: {
    id: "estatus",
    label: "Estatus del alumno",
    tipo: "radio",
    opciones: ["Tiempo completo", "Tiempo parcial"],
    ayuda: "Completo: al menos 40 h/semana; parcial: al menos 20 h/semana (REP Art. 13).",
  },
  calle: { id: "calle", label: "Calle", tipo: "text", seccion: "Domicilio" },
  numExt: { id: "numExt", label: "Número exterior", tipo: "text", seccion: "Domicilio" },
  numInt: { id: "numInt", label: "Número interior", tipo: "text", opcional: true, seccion: "Domicilio" },
  colonia: { id: "colonia", label: "Colonia", tipo: "text", seccion: "Domicilio" },
  alcaldia: { id: "alcaldia", label: "Alcaldía o municipio", tipo: "text", seccion: "Domicilio" },
  cp: { id: "cp", label: "Código postal", tipo: "text", maxLength: 5, seccion: "Domicilio" },
  estadoDom: { id: "estadoDom", label: "Estado", tipo: "text", seccion: "Domicilio" },
  pais: { id: "pais", label: "País", tipo: "text", auto: () => "México", seccion: "Domicilio" },
  telCasa: { id: "telCasa", label: "Teléfono de casa", tipo: "text", opcional: true, seccion: "Contacto" },
  telMovil: { id: "telMovil", label: "Teléfono móvil", tipo: "text", auto: ({ r }) => str(r.telefono), seccion: "Contacto" },
  correo1: { id: "correo1", label: "Correo electrónico 1", tipo: "text", auto: ({ r }) => str(r.correo), seccion: "Contacto" },
  correo2: { id: "correo2", label: "Correo electrónico 2", tipo: "text", opcional: true, seccion: "Contacto" },
  sexo: {
    id: "sexo",
    label: "Sexo",
    tipo: "radio",
    opciones: ["F", "M"],
    auto: ({ r }) => sexoDeCurp(str(r.curp)),
    ayuda: "Tomado de tu CURP.",
    seccion: "Contacto",
  },
  licPrograma: { id: "licPrograma", label: "Licenciatura cursada", tipo: "text", auto: ({ r }) => str(r.ultimosEstudios), seccion: "Formación académica" },
  licInstitucion: { id: "licInstitucion", label: "Institución", tipo: "text", auto: ({ r }) => unidadProcedencia(r), seccion: "Formación académica" },
  licEstado: {
    id: "licEstado",
    label: "Estado o país de la institución",
    tipo: "text",
    auto: ({ r }) => (r.institucion === "IPN" || r.institucion === "UNAM" || r.institucion === "UAM" ? "Ciudad de México" : undefined),
    seccion: "Formación académica",
  },
  licFecha: { id: "licFecha", label: "Fecha de graduación (dd/mm/aaaa)", tipo: "text", seccion: "Formación académica" },
} satisfies Record<string, CampoFormato>;

// ---------- Catálogo de formatos ----------

export const FORMATOS: Formato[] = [
  {
    clave: "sip-02",
    destino: "Departamento de Posgrado",
    codigo: "SIP-02",
    nombre: "Currículum vitae",
    descripcion: "Se arma con tu registro. Solo completa domicilio, fechas y datos que el registro no pide.",
    fase: "registro",
    llena: "aspirante",
    plantilla: "sip-02.pdf",
    pdf: "listo",
    campos: [
      { ...C.programa, seccion: "Datos generales" },
      { ...C.apellidoPaterno, seccion: "Datos generales" },
      { ...C.apellidoMaterno, seccion: "Datos generales" },
      { ...C.nombre, seccion: "Datos generales" },
      { id: "fechaNacimiento", label: "Fecha de nacimiento", tipo: "text", auto: ({ r }) => fechaNacimientoDeCurp(str(r.curp)), ayuda: "Tomado de tu CURP.", seccion: "Datos generales" },
      { id: "lugarNacimiento", label: "Lugar de nacimiento", tipo: "text", auto: ({ r }) => entidadDeCurp(str(r.curp)), ayuda: "Tomado de tu CURP.", seccion: "Datos generales" },
      { id: "nacionalidad", label: "Nacionalidad", tipo: "text", auto: ({ r }) => (entidadDeCurp(str(r.curp)) ? "Mexicana" : undefined), seccion: "Datos generales" },
      { id: "estadoCivil", label: "Estado civil", tipo: "radio", opciones: ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Unión libre", "Viudo(a)"], auto: ({ r }) => estadoCivilSip(str(r.estadoCivil)), seccion: "Datos generales" },
      { id: "curp", label: "CURP", tipo: "text", sistema: true, auto: ({ r }) => str(r.curp), seccion: "Datos generales" },
      { id: "rfc", label: "RFC con homoclave", tipo: "text", maxLength: 13, valido: (v) => /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(v.trim().toUpperCase()), auto: ({ r }) => rfcBaseDeCurp(str(r.curp)), ayuda: "Los primeros 10 caracteres salen de tu CURP; agrega tu homoclave (3 caracteres).", seccion: "Datos generales" },
      C.calle, C.numExt, C.numInt, C.colonia, C.alcaldia, C.cp, C.estadoDom, C.pais,
      C.telCasa, C.telMovil, C.sexo, C.correo1, C.correo2,
      { id: "empresa", label: "Empresa del empleo actual o último", tipo: "text", opcional: true, seccion: "Empleo actual o último" },
      { id: "cargo", label: "Cargo", tipo: "text", opcional: true, auto: ({ r }) => str(r.ultimoPuesto), seccion: "Empleo actual o último" },
      { id: "empleoInicio", label: "Fecha de inicio (dd/mm/aaaa)", tipo: "text", opcional: true, seccion: "Empleo actual o último" },
      { id: "empleoFin", label: "Fecha de término (vacío si sigue vigente)", tipo: "text", opcional: true, seccion: "Empleo actual o último" },
      C.licPrograma, C.licInstitucion,
      { id: "licPais", label: "País", tipo: "text", auto: () => "México", seccion: "Formación académica" },
      { id: "licIngreso", label: "Fecha de ingreso (dd/mm/aaaa)", tipo: "text", seccion: "Formación académica" },
      { id: "licEgreso", label: "Fecha de egreso (dd/mm/aaaa)", tipo: "text", seccion: "Formación académica" },
      { id: "formaTitulacion", label: "Forma de titulación", tipo: "text", auto: ({ r }) => (r.titulado === "No" ? "En trámite" : str(r.opcionTitulacion)), seccion: "Formación académica" },
      { id: "fechaExamen", label: "Fecha de examen profesional (dd/mm/aaaa)", tipo: "text", opcional: true, seccion: "Formación académica" },
      { ...C.licFecha, label: "Fecha del título (dd/mm/aaaa)", opcional: true },
      { id: "cedula", label: "Número de cédula profesional", tipo: "text", opcional: true, seccion: "Formación académica" },
      {
        id: "inglesHabilidades",
        label: "Habilidades de inglés acreditadas",
        tipo: "multi",
        opciones: ["Comprensión de lectura", "Comprensión auditiva", "Expresión escrita", "Expresión oral"],
        ayuda: "Para maestría se requieren al menos dos (REP Art. 7-IV).",
        seccion: "Idiomas",
      },
      { id: "inglesAval", label: "¿Tu constancia tiene aval de la DFLE (o es de CELEX/CENLEX)?", tipo: "radio", opciones: ["Sí", "No"], seccion: "Idiomas" },
      { id: "experiencia", label: "Principales funciones en tu empleo", tipo: "textarea", opcional: true, maxLength: 160, auto: ({ r }) => str(r.empleos).slice(0, 160), seccion: "Experiencia e investigación" },
      { id: "investigacion", label: "Información adicional relevante (investigación, publicaciones…)", tipo: "textarea", opcional: true, maxLength: 700, auto: ({ r }) => str(r.investigacion), seccion: "Experiencia e investigación" },
    ],
    firmas: [{ rol: "aspirante", label: "Firma del aspirante" }],
  },
  {
    clave: "sip-05",
    destino: "Control Escolar (UTEyCV)",
    codigo: "SIP-05",
    nombre: "Carta protesta",
    descripcion: "Declaras conocer la normatividad del IPN. Solo eliges tu estatus, la imprimes y la firmas.",
    fase: "documentos",
    llena: "aspirante",
    plantilla: "sip-05.pdf",
    pdf: "listo",
    campos: [C.fecha, C.nombreCompleto, C.programa, C.estatus],
    firmas: [{ rol: "aspirante", label: "Firma del aspirante" }],
  },
  {
    clave: "sip-06",
    destino: "Control Escolar (UTEyCV)",
    codigo: "SIP-06",
    nombre: "Carta de exposición de motivos",
    descripcion: "Se redacta con lo que respondiste en “Motivos de la solicitud”. Puedes ajustarla antes de imprimirla.",
    fase: "documentos",
    llena: "aspirante",
    plantilla: "sip-06.pdf",
    pdf: "listo",
    campos: [
      C.fecha,
      C.nombreCompleto,
      C.programa,
      {
        id: "motivos",
        label: "Motivos",
        tipo: "textarea",
        maxLength: 1800,
        auto: ({ r }) => [r.interesArea, r.motivoPrograma, r.comoAyudara].map((x) => str(x)).filter(Boolean).join("\n\n"),
      },
    ],
    firmas: [{ rol: "aspirante", label: "Firma del aspirante" }],
  },
  {
    clave: "mtc-ec",
    destino: "Departamento de Posgrado",
    paginasAspirante: [0],
    codigo: "MTC-EC",
    nombre: "Acta de entrevista colegiada",
    descripcion: "Llena tus datos antes de tu entrevista colegiada.",
    fase: "entrevista",
    llena: "aspirante",
    plantilla: "mtc-ec.pdf",
    pdf: "listo",
    campos: [
      { id: "semestreIngreso", label: "Proceso de admisión", tipo: "text", sistema: true, auto: ({ r }) => str(r.semestre).split(" ")[0] },
      { id: "fechaEntrevista", label: "Fecha de la entrevista", tipo: "text", sistema: true, auto: () => "18 de marzo de 2026" },
      C.nombreCompleto,
      {
        id: "areasRanking",
        label: "Áreas de interés para tu tesis (elige 3 en orden de preferencia)",
        tipo: "ranking",
        opciones: AREAS_INVESTIGACION,
        auto: ({ r }) => (Array.isArray(r.areasInteres) ? r.areasInteres.slice(0, 3) : undefined),
        ayuda: "Sugeridas a partir de tu registro.",
      },
      { id: "becaSecihti", label: "¿Solicitarás beca SECIHTI?", tipo: "radio", opciones: ["Sí", "No"] },
      { id: "sinBeca", label: "¿Continuarías el proceso aún sin beca?", tipo: "radio", opciones: ["Sí", "No"] },
      { id: "profesorInteres", label: "¿Hay algún profesor investigador del CIDETEC con el que te interese trabajar?", tipo: "radio", opciones: ["Sí", "No"] },
      { id: "profesorNombre", label: "Nombre del profesor", tipo: "text", mostrarSi: (v) => v("profesorInteres") === "Sí" },
      { id: "horario", label: "Preferencia de horario", tipo: "radio", opciones: ["Matutino", "Vespertino", "Indistinto"] },
      { id: "ingles2", label: "¿Tienes dos habilidades de inglés acreditadas?", tipo: "radio", opciones: ["Sí", "No"] },
      { id: "inglesSituacion", label: "Situación de tu constancia de inglés", tipo: "text", opcional: true },
      { id: "promedio", label: "Promedio de licenciatura", tipo: "text", auto: ({ r }) => str(r.promedio) },
      { id: "certificadoTiene", label: "¿Tienes certificado de estudios?", tipo: "radio", opciones: ["Sí", "No"], auto: ({ r }) => str(r.certificado) || undefined },
      { id: "certificadoSituacion", label: "Situación del certificado", tipo: "text", opcional: true, auto: ({ r }) => str(r.causaNoCertificado) },
      { id: "escuelaOrigen", label: "Escuela donde estudiaste", tipo: "radio", opciones: ["IPN", "Externo"], auto: ({ r }) => (r.institucion ? (r.institucion === "IPN" ? "IPN" : "Externo") : undefined) },
      { id: "escuelaNombre", label: "Nombre de la escuela", tipo: "text", auto: ({ r }) => unidadProcedencia(r) },
      {
        id: "argumentacion",
        label: "Argumentación final: ¿por qué deberíamos recomendar tu ingreso y cómo contribuirías al ambiente académico?",
        tipo: "textarea",
        maxLength: 900,
      },
    ],
    firmas: [
      { rol: "sinodo", label: "Entrevistador 1", ocultaAspirante: true },
      { rol: "sinodo", label: "Entrevistador 2", ocultaAspirante: true },
      { rol: "sinodo", label: "Entrevistador 3", ocultaAspirante: true },
    ],
  },
  {
    clave: "sip-04",
    destino: "Aspirante (lo emite UTEyCV)",
    codigo: "SIP-04",
    nombre: "Dictamen del proceso de admisión",
    descripcion: "Lo emite la Comisión de Admisión. Revisa que tus datos sean correctos y confírmalos; después solo esperas el dictamen firmado.",
    fase: "dictamen",
    llena: "area",
    confirmaAspirante: true,
    plantilla: "sip-04.pdf",
    pdf: "listo",
    campos: [
      C.apellidoPaterno,
      C.apellidoMaterno,
      C.nombre,
      C.programa,
      { ...C.estatus, id: "estatus", label: "Dedicación", ayuda: "La elegiste en tu carta protesta (SIP-05)." },
    ],
    firmas: [
      { rol: "comision", label: "Miembros de la Comisión de Admisión" },
      { rol: "jefe", label: "Coordinador del programa y Presidente del Colegio de Profesores" },
    ],
  },
  {
    clave: "sip-01",
    destino: "Control Escolar (UTEyCV)",
    codigo: "SIP-01",
    nombre: "Solicitud de inscripción",
    descripcion: "Se llena con tu registro, tu CV (SIP-02) y tu carta protesta (SIP-05). Tu foto se coloca sola.",
    fase: "matricula",
    llena: "aspirante",
    plantilla: "sip-01.pdf",
    pdf: "listo",
    capturaOtros: "Programa semestral (cursos del 1er semestre): lo captura tu asesor académico.",
    campos: [
      C.apellidoPaterno, C.apellidoMaterno, C.nombre,
      C.calle, C.numExt, C.numInt, C.colonia, C.alcaldia, C.cp, C.estadoDom, C.pais,
      C.telCasa, C.telMovil, C.sexo, C.correo1, C.correo2,
      C.unidad, C.programa,
      C.licPrograma, C.licInstitucion, C.licEstado, C.licFecha,
      C.estatus,
      { ...C.fecha, id: "fechaInscripcion" },
      {
        id: "avisoPrivacidad",
        label: "¿Aceptas el aviso de privacidad de la Dirección de Posgrado? (hoja 2 del SIP-01)",
        tipo: "radio",
        opciones: ["Acepto", "No acepto"],
        ayuda: "Revísalo en la vista previa del PDF. Si no lo aceptas, no es posible continuar con tu inscripción.",
        valido: (v) => v === "Acepto",
        seccion: "Aviso de privacidad",
      },
    ],
    firmas: [
      { rol: "aspirante", label: "Alumno" },
      { rol: "asesor", label: "Asesor académico" },
      { rol: "jefe", label: "Jefe(a) de la Sección o Director(a) del Centro" },
    ],
  },
  {
    clave: "sip-08",
    destino: "Control Escolar (UTEyCV)",
    codigo: "SIP-08",
    nombre: "Programa individual de actividades",
    descripcion: "Lo prepara tu asesor académico con Control Escolar (UTEyCV); tú lo revisas, lo firmas y lo subes.",
    fase: "matricula",
    llena: "asesor",
    plantilla: "sip-08.pdf",
    pdf: "listo",
    campos: [
      { ...C.fecha, id: "fechaPrograma" },
      { id: "noRegistro", label: "Número de registro", tipo: "text", sistema: true, auto: () => PROGRAMA_INDIVIDUAL_DEMO.noRegistro },
      C.apellidoPaterno,
      C.apellidoMaterno,
      C.nombre,
      C.nombreCompleto,
      { ...C.estatus, sistema: true, auto: ({ c }) => (typeof c.estatus === "string" ? c.estatus : "Tiempo completo") },
      C.programa,
      C.unidad,
      { id: "asesor", label: "Asesor académico", tipo: "text", sistema: true, auto: () => nombreAsesor() },
    ],
    firmas: [
      { rol: "aspirante", label: "Interesado(a)" },
      { rol: "asesor", label: "Asesor académico" },
      { rol: "jefe", label: "Jefe(a) de la Sección o Director(a) del Centro" },
    ],
  },
];

export const formatoPorClave = (clave: string) => FORMATOS.find((f) => f.clave === clave);
export const formatosDeFase = (fase: EtapaId) => FORMATOS.filter((f) => f.fase === fase);

// ---------- Resolución de valores ----------

export function resolver(campo: CampoFormato, ctx: Contexto): Valor | undefined {
  if (!campo.sistema && ctx.c[campo.id] !== undefined) return ctx.c[campo.id];
  const v = campo.auto?.(ctx);
  return v === "" ? undefined : v;
}

export const esVacio = (v: Valor | undefined) => (Array.isArray(v) ? v.length === 0 : !v || !v.trim());

export function camposVisibles(f: Formato, ctx: Contexto) {
  const v = (id: string) => {
    const campo = f.campos.find((c) => c.id === id);
    return campo ? resolver(campo, ctx) : ctx.c[id];
  };
  return f.campos.filter((c) => (c.mostrarSi ? c.mostrarSi(v) : true));
}

/** Campos obligatorios sin valor (ni del registro ni capturados). */
export function faltantes(f: Formato, ctx: Contexto) {
  return camposVisibles(f, ctx).filter((c) => {
    if (c.sistema) return false;
    const v = resolver(c, ctx);
    if (esVacio(v)) return !c.opcional;
    return !!c.valido && typeof v === "string" && !c.valido(v);
  });
}

/** Campos que el sistema llenó sin que el aspirante los escribiera. */
export function autollenados(f: Formato, ctx: Contexto) {
  return camposVisibles(f, ctx).filter((c) => ctx.c[c.id] === undefined && !esVacio(c.auto?.(ctx)));
}
