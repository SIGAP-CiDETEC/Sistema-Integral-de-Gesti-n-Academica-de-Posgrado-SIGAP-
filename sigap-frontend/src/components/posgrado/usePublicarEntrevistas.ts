"use client";

import { usePosgrado } from "./PosgradoProvider";
import { fechaCorta, nombreProfesor, sinodoCompleto, type AspiranteP, type Entrevista } from "@/lib/posgrado/datos";

export const citaTexto = (e: Pick<Entrevista, "fecha" | "hora" | "modalidad" | "sala">) => `${fechaCorta(e.fecha)} a las ${e.hora} h · ${e.modalidad} · ${e.sala}`;
const FIRMA = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

/**
 * Publicación de entrevistas en dos pasos:
 * 1) Posgrado publica el HORARIO a los profesores (lo ven solo con día y hora y lo eligen);
 * 2) cuando el sínodo tiene 3 profesores, Posgrado publica la ENTREVISTA al aspirante (aviso y recordatorios).
 */
export function usePublicarEntrevistas() {
  const { actualizar, enviarAviso } = usePosgrado();

  const publicarHorario = (a: AspiranteP) => {
    const e = a.entrevista;
    if (!e || e.horarioPublicadoEl) return;
    actualizar(
      a.id,
      { entrevista: { ...e, horarioPublicadoEl: new Date().toISOString() } },
      `Publicó el horario de entrevista ${fechaCorta(e.fecha)} ${e.hora} h para que los profesores lo elijan`,
    );
  };

  const publicarEntrevista = (a: AspiranteP) => {
    const e = a.entrevista;
    if (!e || e.notificadaEl || !sinodoCompleto(e)) return;
    actualizar(
      a.id,
      { entrevista: { ...e, notificadaEl: new Date().toISOString() } },
      `Publicó la entrevista al aspirante: ${citaTexto(e)}; sínodo: ${e.sinodo.map(nombreProfesor).join(", ")}`,
    );
    enviarAviso(
      [a.id],
      "ambos",
      "Tu entrevista colegiada fue programada",
      `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nTu entrevista colegiada quedó programada: ${citaTexto(e)}.\n\nLlega 15 minutos antes con una identificación oficial.${FIRMA}`,
    );
  };

  return { publicarHorario, publicarEntrevista };
}
