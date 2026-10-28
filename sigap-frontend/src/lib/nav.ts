/**
 * Menú lateral de cada rol. Agregar una pestaña = agregar un elemento aquí
 * y crear su carpeta con page.tsx dentro de src/app/<rol>/.
 */

export type Rol = "aspirante" | "alumno" | "posgrado" | "uteycv" | "subdireccion" | "profesor" | "coordinador" | "admin";
/** Sesiones que, con el servidor real, se muestran como demostración con datos ficticios. */
export const ROLES_DEMO: Rol[] = ["aspirante", "alumno"];

export type IconName =
  | "home"
  | "admision"
  | "expedientes"
  | "entrevistas"
  | "evaluacion"
  | "notificaciones"
  | "convocatoria"
  | "roles"
  | "usuarios"
  | "bitacora"
  | "registro"
  | "dictamen"
  | "matricula"
  | "horario"
  | "tesis"
  | "comunicados"
  | "idiomas"
  | "cartas"
  | "resultados"
  | "contenido"
  | "calendario"
  | "panorama";

export type NavItem = { label: string; href: string; icon: IconName };

export const ROL_LABEL: Record<Rol, string> = {
  aspirante: "Aspirante",
  alumno: "Alumno",
  posgrado: "Depto. de Posgrado",
  uteycv: "UTEyCV · Control Escolar",
  subdireccion: "Subdirección Académica",
  profesor: "Profesor · Colegio",
  coordinador: "Coordinador del programa",
  admin: "Administrador",
};

export const NAV: Record<Rol, NavItem[]> = {
  aspirante: [
    { label: "Inicio", href: "/aspirante", icon: "home" },
    { label: "Mi admisión", href: "/aspirante/admision", icon: "admision" },
    { label: "1. Registro", href: "/aspirante/registro", icon: "registro" },
    { label: "2. Documentos", href: "/aspirante/documentos", icon: "expedientes" },
    { label: "3. Entrevista", href: "/aspirante/entrevista", icon: "entrevistas" },
    { label: "4. Evaluación", href: "/aspirante/evaluacion", icon: "evaluacion" },
    { label: "5. Resultados", href: "/aspirante/resultados", icon: "resultados" },
    { label: "6. Dictamen final", href: "/aspirante/dictamen", icon: "dictamen" },
    // Proceso aparte, después de la admisión (Módulos 6, 7, 8 y 19)
    { label: "Inscripción", href: "/aspirante/inscripcion", icon: "matricula" },
    { label: "Notificaciones", href: "/aspirante/notificaciones", icon: "notificaciones" },
  ],
  // Vistas del alumno: fuera del alcance actual (el proceso de admisión termina con la resolución del Colegio)
  alumno: [
    { label: "Inicio", href: "/alumno", icon: "home" },
    { label: "Horario y profesores", href: "/alumno/horario", icon: "horario" },
    { label: "Directores de tesis", href: "/alumno/tesis", icon: "tesis" },
  ],
  posgrado: [
    { label: "Inicio", href: "/posgrado", icon: "home" },
    { label: "Aspirantes", href: "/posgrado/aspirantes", icon: "expedientes" },
    { label: "Entrevistas", href: "/posgrado/entrevistas", icon: "entrevistas" },
    { label: "Dictamen de entrevista colegiada", href: "/posgrado/dictamen-entrevista", icon: "dictamen" },
    { label: "Evaluación", href: "/posgrado/evaluacion", icon: "evaluacion" },
    { label: "Calificaciones", href: "/posgrado/calificaciones", icon: "resultados" },
    { label: "Comisión y dictamen final", href: "/posgrado/comision", icon: "dictamen" },
    { label: "Comunicados", href: "/posgrado/comunicados", icon: "comunicados" },
    { label: "Inicio del aspirante", href: "/posgrado/inicio-aspirante", icon: "contenido" },
    { label: "Convocatorias y calendario", href: "/posgrado/calendario", icon: "calendario" },
    { label: "Bitácora", href: "/posgrado/bitacora", icon: "bitacora" },
  ],
  // Control Escolar: solo lo que le toca del proceso de admisión
  uteycv: [
    { label: "Inicio", href: "/uteycv", icon: "home" },
    { label: "Inscripciones", href: "/uteycv/inscripciones", icon: "matricula" },
    { label: "Bitácora", href: "/uteycv/bitacora", icon: "bitacora" },
  ],
  // Subdirección Académica: solo consulta (no interviene en el proceso)
  subdireccion: [
    { label: "Inicio", href: "/subdireccion", icon: "panorama" },
    { label: "Aspirantes", href: "/subdireccion/aspirantes", icon: "expedientes" },
    { label: "Bitácora", href: "/subdireccion/bitacora", icon: "bitacora" },
  ],
  // Profesores: eligen entrevistas (acta MTC-EC) y califican los grupos del propedéutico que imparten
  profesor: [
    { label: "Inicio", href: "/profesor", icon: "home" },
    { label: "Mis entrevistas", href: "/profesor/entrevistas", icon: "entrevistas" },
    { label: "Calificaciones del propedéutico", href: "/profesor/evaluacion", icon: "evaluacion" },
  ],
  // Coordinador del programa: únicamente firma las actas de los cursos propedéuticos (SIP-12)
  coordinador: [
    { label: "Inicio", href: "/coordinador", icon: "home" },
    { label: "Actas SIP-12", href: "/coordinador/actas", icon: "dictamen" },
  ],
  admin: [
    { label: "Inicio", href: "/admin", icon: "home" },
    { label: "Convocatoria", href: "/admin/convocatoria", icon: "convocatoria" },
    { label: "Roles", href: "/admin/roles", icon: "roles" },
    { label: "Usuarios", href: "/admin/usuarios", icon: "usuarios" },
    { label: "Bitácora", href: "/admin/bitacora", icon: "bitacora" },
  ],
};

/**
 * Menú con el servidor real: solo las pantallas ya conectadas a la API (módulo completo de Posgrado, profesores y
 * consulta de Subdirección). El resto del sistema sigue disponible con los datos de ejemplo cuando no hay servidor.
 */
export const NAV_SERVIDOR: Partial<Record<Rol, NavItem[]>> = {
  posgrado: NAV.posgrado,
  profesor: NAV.profesor,
  subdireccion: [
    { label: "Inicio", href: "/subdireccion", icon: "panorama" },
    { label: "Aspirantes", href: "/subdireccion/aspirantes", icon: "expedientes" },
    { label: "Bitácora", href: "/subdireccion/bitacora", icon: "bitacora" },
  ],
};

/** Usuario de ejemplo mientras no hay autenticación real. */
export const USUARIO_DEMO: Record<Rol, string> = {
  aspirante: "María González",
  alumno: "María González",
  posgrado: "Laura Hernández",
  uteycv: "Control Escolar",
  subdireccion: "Subdirección Académica",
  profesor: "Dr. Ricardo Morales Vega",
  coordinador: "Dr. Mario Aldape Pérez",
  admin: "Admin CIDETEC",
};
