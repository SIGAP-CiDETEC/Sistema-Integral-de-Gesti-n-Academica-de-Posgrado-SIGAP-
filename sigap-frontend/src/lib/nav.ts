/**
 * Menú lateral de cada rol. Agregar una pestaña = agregar un elemento aquí
 * y crear su carpeta con page.tsx dentro de src/app/<rol>/.
 */

export type Rol = "aspirante" | "alumno" | "posgrado" | "uteycv" | "admin";

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
  | "cartas";

export type NavItem = { label: string; href: string; icon: IconName };

export const ROL_LABEL: Record<Rol, string> = {
  aspirante: "Aspirante",
  alumno: "Alumno",
  posgrado: "Depto. de Posgrado",
  uteycv: "UTEyCV · Control Escolar",
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
    { label: "5. Dictamen final", href: "/aspirante/dictamen", icon: "dictamen" },
    { label: "6. Matrícula", href: "/aspirante/matricula", icon: "matricula" },
    { label: "Notificaciones", href: "/aspirante/notificaciones", icon: "notificaciones" },
  ],
  // Al tener número SICEP ya no aparecen las pestañas del proceso de admisión
  alumno: [
    { label: "Inicio", href: "/alumno", icon: "home" },
    { label: "Horario y profesores", href: "/alumno/horario", icon: "horario" },
    { label: "Directores de tesis", href: "/alumno/tesis", icon: "tesis" },
  ],
  posgrado: [
    { label: "Inicio", href: "/posgrado", icon: "home" },
    { label: "Aspirantes", href: "/posgrado/aspirantes", icon: "expedientes" },
    { label: "Entrevistas", href: "/posgrado/entrevistas", icon: "entrevistas" },
    { label: "Evaluación", href: "/posgrado/evaluacion", icon: "evaluacion" },
    { label: "Comisión y dictamen", href: "/posgrado/comision", icon: "dictamen" },
    { label: "Comunicados", href: "/posgrado/comunicados", icon: "comunicados" },
    { label: "Bitácora", href: "/posgrado/bitacora", icon: "bitacora" },
  ],
  // Control Escolar: solo lo que le toca del proceso de admisión
  uteycv: [
    { label: "Inicio", href: "/uteycv", icon: "home" },
    { label: "Aval de inglés (DFLE)", href: "/uteycv/ingles", icon: "idiomas" },
    { label: "Cartas SIP-05 y SIP-06", href: "/uteycv/cartas", icon: "cartas" },
    { label: "Dictamen SIP-04", href: "/uteycv/dictamen", icon: "dictamen" },
    { label: "Matrícula", href: "/uteycv/matricula", icon: "matricula" },
    { label: "Bitácora", href: "/uteycv/bitacora", icon: "bitacora" },
  ],
  admin: [
    { label: "Inicio", href: "/admin", icon: "home" },
    { label: "Convocatoria", href: "/admin/convocatoria", icon: "convocatoria" },
    { label: "Roles", href: "/admin/roles", icon: "roles" },
    { label: "Usuarios", href: "/admin/usuarios", icon: "usuarios" },
    { label: "Bitácora", href: "/admin/bitacora", icon: "bitacora" },
  ],
};

/** Usuario de ejemplo mientras no hay autenticación real. */
export const USUARIO_DEMO: Record<Rol, string> = {
  aspirante: "María González",
  alumno: "María González",
  posgrado: "Laura Hernández",
  uteycv: "Control Escolar",
  admin: "Admin CIDETEC",
};
