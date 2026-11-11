"use client";

/**
 * Conexión con la API de SIGAP (sigap-backend).
 * Si NEXT_PUBLIC_API_URL está definida, el sistema trabaja con el servidor real (login, aspirantes,
 * entrevista colegiada y documentos); si no, funciona con los datos de ejemplo del navegador.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const MODO_API = API_URL.length > 0;
/**
 * Con el servidor real, las sesiones de aspirante y alumno pueden abrirse como demostración con datos
 * ficticios del navegador (no tocan la API ni a los aspirantes reales). Apagada salvo que se compile con
 * NEXT_PUBLIC_DEMO=1.
 */
export const DEMO_ASPIRANTES = MODO_API && process.env.NEXT_PUBLIC_DEMO === "1";
/**
 * Botones de "Vista de prueba (solo cascarón)" para recorrer el flujo del aspirante y del alumno (simular resultados,
 * dictamen, documentos…). Solo en la demostración (Vercel, sin servidor); nunca con el servidor real.
 */
export const SIMULACION = !MODO_API || DEMO_ASPIRANTES;

const CLAVE_TOKEN = "sigap-token";

export const leerToken = () => {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
};
export function guardarToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(CLAVE_TOKEN, t);
    else sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* ignorar */
  }
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message);
  }
}

/** Llama a la API con la sesión; si la sesión ya no vale, vuelve al login. */
/** Área del servidor de cada sesión del front (para las cuentas que atienden más de un área). */
const AREA_DE_ROL: Record<string, string> = { posgrado: "POSGRADO", profesor: "PROFESORES", subdireccion: "SUBDIRECCION", uteycv: "UTEYCV", admin: "ADMINISTRADOR", aspirante: "ASPIRANTES" };

/** Encabezados de la petición: el token y, si la cuenta tiene varias áreas, con cuál está actuando. */
function encabezados(): Record<string, string> {
  const token = leerToken();
  let area = "";
  try {
    const s = JSON.parse(localStorage.getItem("sigap-sesion") ?? "null") as { rol?: string; roles?: string[] } | null;
    if (s?.rol && (s.roles?.length ?? 0) > 1) area = AREA_DE_ROL[s.rol] ?? "";
  } catch {
    /* ignorar */
  }
  return { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(area ? { "x-sigap-area": area } : {}) };
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; formulario?: FormData } = {}): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: opciones.metodo ?? (opciones.cuerpo || opciones.formulario ? "POST" : "GET"),
    headers: { ...encabezados(), ...(opciones.cuerpo !== undefined ? { "content-type": "application/json" } : {}) },
    body: opciones.formulario ?? (opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined),
  });
  const texto = await r.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  if (!r.ok) {
    const m = (datos as { message?: string | string[] } | null)?.message;
    const mensaje = Array.isArray(m) ? m.join(". ") : m || "No se pudo completar la operación";
    if (r.status === 401 && ruta !== "/auth/login" && typeof window !== "undefined") {
      guardarToken(null);
      localStorage.removeItem("sigap-sesion");
      window.location.href = "/login";
    }
    throw new ErrorApi(mensaje, r.status);
  }
  return datos as T;
}

/** Abre en otra pestaña un PDF protegido (documento del aspirante o acta firmada). Devuelve el error, si lo hubo. */
export async function abrirArchivo(ruta: string): Promise<string | null> {
  const ventana = window.open("", "_blank");
  try {
    const r = await fetch(`${API_URL}${ruta}`, { headers: encabezados() });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.message ?? "No se pudo abrir el archivo");
    const url = URL.createObjectURL(await r.blob());
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    return null;
  } catch (e) {
    ventana?.close();
    return e instanceof Error ? e.message : "No se pudo abrir el archivo";
  }
}
