"use client";

/**
 * Conexión con la API de SIGAP (sigap-backend).
 * Si NEXT_PUBLIC_API_URL está definida, el sistema trabaja con el servidor real (login, aspirantes,
 * entrevista colegiada y documentos); si no, funciona con los datos de ejemplo del navegador.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const MODO_API = API_URL.length > 0;

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
export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; formulario?: FormData } = {}): Promise<T> {
  const token = leerToken();
  const r = await fetch(`${API_URL}${ruta}`, {
    method: opciones.metodo ?? (opciones.cuerpo || opciones.formulario ? "POST" : "GET"),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(opciones.cuerpo !== undefined ? { "content-type": "application/json" } : {}) },
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
    const r = await fetch(`${API_URL}${ruta}`, { headers: { authorization: `Bearer ${leerToken() ?? ""}` } });
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
