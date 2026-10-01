"use client";

import { useSyncExternalStore } from "react";

/**
 * Recordatorios automáticos al aspirante (correo y notificación en SIGAP).
 * - Entrevista colegiada: un día antes y una hora antes de la cita.
 * - Examen de admisión: cada 5 días hasta el examen, un día antes y el mismo día.
 * Con backend: los programa una cola de trabajos (BullMQ) al confirmar la cita o la elección del examen.
 * Solo cascarón: se calculan con las fechas registradas y se consideran "enviados" cuando ya pasó su hora
 * (o si se simula el paso del tiempo).
 */
export type Recordatorio = { id: string; cuando: string; asunto: string; mensaje: string; tipo: "entrevista" | "examen" };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const larga = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};
const fechaHora = (fecha: string, hora: string) => new Date(`${fecha}T${hora || "09:00"}:00`);
const firma = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

export function recordatoriosEntrevista(e: { fecha: string; hora: string; modalidad: string; sala: string }, nombre: string): Recordatorio[] {
  const cita = fechaHora(e.fecha, e.hora);
  const lugar = `${e.sala} (${e.modalidad})`;
  const hola = `Estimado(a) ${nombre}:\n\n`;
  const diaAntes = new Date(cita.getTime() - 24 * 3600 * 1000);
  const horaAntes = new Date(cita.getTime() - 3600 * 1000);
  return [
    {
      id: `ent-1d-${e.fecha}-${e.hora}`,
      cuando: iso(diaAntes),
      tipo: "entrevista",
      asunto: "Recordatorio: mañana es tu entrevista colegiada",
      mensaje: `${hola}Te recordamos que mañana ${larga(cita)} a las ${e.hora} h es tu entrevista colegiada en ${lugar}. Llega 15 minutos antes con una identificación oficial.${firma}`,
    },
    {
      id: `ent-1h-${e.fecha}-${e.hora}`,
      cuando: iso(horaAntes),
      tipo: "entrevista",
      asunto: "Recordatorio: tu entrevista colegiada es en una hora",
      mensaje: `${hola}Tu entrevista colegiada comienza en una hora (${e.hora} h) en ${lugar}.${firma}`,
    },
  ];
}

/**
 * Recordatorios del examen: cada 5 días contando hacia atrás desde el examen (mientras sean posteriores
 * a la elección), un día antes y el mismo día a las 7:00 h.
 */
export function recordatoriosExamen(ex: { fecha: string; hora: string; lugar: string }, desde: string, nombre: string, areas?: string): Recordatorio[] {
  const examen = fechaHora(ex.fecha, ex.hora);
  const inicio = new Date(desde);
  const hola = `Estimado(a) ${nombre}:\n\n`;
  const que = areas ? `tu examen de admisión (${areas})` : "tu examen de admisión";
  const dia = (n: number) => {
    const d = new Date(`${ex.fecha}T09:00:00`);
    d.setDate(d.getDate() - n);
    return d;
  };
  const out: Recordatorio[] = [];
  for (let n = 5; dia(n) > inicio && n <= 120; n += 5)
    out.push({
      id: `ex-${n}d-${ex.fecha}`,
      cuando: iso(dia(n)),
      tipo: "examen",
      asunto: `Recordatorio: faltan ${n} días para ${que}`,
      mensaje: `${hola}Faltan ${n} días para ${que}: ${larga(examen)} a las ${ex.hora} h en ${ex.lugar}.${firma}`,
    });
  const antes = dia(1);
  if (antes > inicio)
    out.push({
      id: `ex-1d-${ex.fecha}`,
      cuando: iso(antes),
      tipo: "examen",
      asunto: "Recordatorio: mañana es tu examen de admisión",
      mensaje: `${hola}Mañana ${larga(examen)} a las ${ex.hora} h presentas ${que} en ${ex.lugar}. Lleva una identificación oficial.${firma}`,
    });
  const mismo = new Date(`${ex.fecha}T07:00:00`);
  out.push({
    id: `ex-0d-${ex.fecha}`,
    cuando: iso(mismo),
    tipo: "examen",
    asunto: "Hoy es tu examen de admisión",
    mensaje: `${hola}Hoy a las ${ex.hora} h presentas ${que} en ${ex.lugar}. ¡Mucho éxito!${firma}`,
  });
  return out.sort((a, b) => a.cuando.localeCompare(b.cuando));
}

export const fechaRecordatorio = (cuando: string) =>
  new Date(cuando).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ---------- Solo cascarón: simular el paso del tiempo ----------
const CLAVE = "sigap-recordatorios-simulados";
const EVENTO = "sigap-recordatorios";
const leer = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};
const suscribir = (cb: () => void) => {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
};
export function simularEnvioRecordatorios(si: boolean) {
  try {
    if (si) localStorage.setItem(CLAVE, "1");
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}
/** Devuelve si un recordatorio ya "se envió". */
export function useEnviado() {
  const simulado = useSyncExternalStore(suscribir, leer, () => null) === "1";
  return { simulado, enviado: (r: Recordatorio) => simulado || new Date(r.cuando).getTime() <= Date.now() };
}
