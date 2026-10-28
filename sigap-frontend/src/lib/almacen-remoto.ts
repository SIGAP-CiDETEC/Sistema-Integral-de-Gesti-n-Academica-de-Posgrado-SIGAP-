"use client";

import { MODO_API, api, leerToken } from "./api";
import { notificar } from "./avisos-ui";

/**
 * Con el servidor real, la configuración que edita Posgrado se guarda en el servidor (almacén compartido) y el
 * navegador solo la guarda como copia para mostrarla. Sin servidor, todo sigue en el navegador como antes.
 * - convocatorias y contenido: públicos (inicio y login).
 * - evaluacion: para el personal con sesión.
 */
export const ALMACENES = {
  convocatorias: { local: "sigap-convocatoria", publico: true },
  contenido: { local: "sigap-contenido", publico: true },
  evaluacion: { local: "sigap-evaluacion-config", publico: false },
} as const;
export type ClaveAlmacen = keyof typeof ALMACENES;

/** Escribe la copia del navegador y avisa a las pantallas (el evento se llama igual que la clave local). */
function escribirLocal(clave: ClaveAlmacen, valor: unknown) {
  const { local } = ALMACENES[clave];
  try {
    if (valor === null || valor === undefined) localStorage.removeItem(local);
    else localStorage.setItem(local, JSON.stringify(valor));
  } catch {
    /* sin espacio: se queda con lo anterior */
  }
  window.dispatchEvent(new Event(local));
}

/** Trae del servidor las copias más recientes (las públicas siempre; las demás si hay sesión). */
export async function sincronizarAlmacenes() {
  if (!MODO_API) return;
  const conSesion = !!leerToken();
  await Promise.all(
    (Object.keys(ALMACENES) as ClaveAlmacen[]).map(async (clave) => {
      const { publico } = ALMACENES[clave];
      if (!publico && !conSesion) return;
      try {
        const r = await api<{ valor: unknown }>(publico ? `/almacen/publico/${clave}` : `/almacen/${clave}`);
        escribirLocal(clave, r.valor);
      } catch {
        /* sin conexión: se queda con la copia del navegador */
      }
    }),
  );
}

/** Guarda en el servidor lo que Posgrado acaba de cambiar (la copia del navegador ya se actualizó). */
export function subirAlmacen(clave: ClaveAlmacen, valor: unknown) {
  if (!MODO_API) return;
  api(`/almacen/${clave}`, { metodo: "PUT", cuerpo: { valor } }).catch((e) =>
    notificar(`No se guardó en el servidor: ${e instanceof Error ? e.message : "error de conexión"}. Vuelve a intentarlo.`),
  );
}
