/** El CIDETEC opera en la Ciudad de México (UTC-6 todo el año desde 2022). */
const ZONA = 'America/Mexico_City';

/** "2026-11-20" + "10:30" (hora de la Ciudad de México) → Date */
export function aFechaHora(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-06:00`);
}

/** Date → { fecha: "AAAA-MM-DD", hora: "HH:MM" } en hora de la Ciudad de México */
export function deFechaHora(d: Date): { fecha: string; hora: string } {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { fecha: `${v('year')}-${v('month')}-${v('day')}`, hora: `${v('hour')}:${v('minute')}` };
}
