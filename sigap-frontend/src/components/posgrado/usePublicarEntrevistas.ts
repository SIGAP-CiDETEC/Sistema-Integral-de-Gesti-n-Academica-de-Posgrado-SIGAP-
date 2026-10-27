"use client";

import { usePosgrado } from "./PosgradoProvider";
import { fechaCorta, horarioEntrevista, nombreProfesor, sinodoCompleto, type AspiranteP, type Entrevista } from "@/lib/posgrado/datos";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";

export const citaTexto = (e: Pick<Entrevista, "fecha" | "hora" | "duracion" | "modalidad" | "sala">) => `${fechaCorta(e.fecha)} de ${horarioEntrevista(e)} · ${e.modalidad} · ${e.sala}`;
const FIRMA = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

/**
 * Publicación de entrevistas en dos pasos:
 * 1) Posgrado publica el HORARIO a los profesores (lo ven solo con día y hora y lo eligen);
 * 2) cuando ya están los 3 profesores entrevistadores, Posgrado publica la ENTREVISTA al aspirante (aviso y recordatorios).
 */
export function usePublicarEntrevistas() {
  const { actualizar, enviarAviso, recargar } = usePosgrado();

  /** Con el servidor real, cada acción es una llamada a la API (que valida las reglas) y luego se recargan los datos. */
  const enServidor = async (ruta: string, exito: string) => {
    try {
      await api(ruta, { metodo: "POST" });
      notificar(exito, "exito");
    } catch (e) {
      notificar(mensajeDe(e));
    }
    await recargar();
  };

  const publicarHorario = (a: AspiranteP) => {
    if (MODO_API) return void enServidor(`/aspirantes/${a.id}/entrevista/publicar-horario`, `Horario de ${a.nombre} publicado a los profesores`);
    const e = a.entrevista;
    if (!e || e.horarioPublicadoEl) return;
    actualizar(
      a.id,
      { entrevista: { ...e, horarioPublicadoEl: new Date().toISOString() } },
      `Publicó el horario de entrevista ${fechaCorta(e.fecha)} de ${horarioEntrevista(e)} para que los profesores lo elijan`,
    );
  };

  const publicarEntrevista = (a: AspiranteP) => {
    if (MODO_API) return void enServidor(`/aspirantes/${a.id}/entrevista/publicar`, `Entrevista de ${a.nombre} publicada al aspirante`);
    const e = a.entrevista;
    if (!e || e.notificadaEl || !sinodoCompleto(e)) return;
    actualizar(
      a.id,
      { entrevista: { ...e, notificadaEl: new Date().toISOString() } },
      `Publicó la entrevista al aspirante: ${citaTexto(e)}; profesores entrevistadores: ${e.sinodo.map(nombreProfesor).join(", ")}`,
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
