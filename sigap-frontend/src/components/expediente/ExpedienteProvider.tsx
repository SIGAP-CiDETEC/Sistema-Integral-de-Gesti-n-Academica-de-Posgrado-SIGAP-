"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { REGISTRO_DEMO } from "@/lib/aspirante-datos";
import type { Capturas, Contexto, Valor } from "@/lib/formatos";
import type { Respuestas } from "@/lib/registro-form";

/**
 * Estado del expediente del aspirante en el navegador (solo cascarón).
 * Con backend, cada setter se convierte en una llamada a la API
 * (PATCH /expediente, POST /documentos, POST /formatos/:clave/firmado…).
 */

export type ArchivoCargado = { nombre: string; bytes: number; fecha: string; dataUrl?: string };

/** Elección de evaluación (fase 4): modalidad, grupo por materia y confirmación. */
export type EleccionEvaluacion = {
  modalidad?: "propedeutico" | "examen";
  grupos: Record<string, string>;
  confirmadaEl?: string;
};

type Estado = {
  registro: Respuestas;
  capturas: Capturas;
  /** PDF firmado a mano y escaneado, por clave de formato */
  firmados: Record<string, ArchivoCargado>;
  documentos: Record<string, ArchivoCargado>;
  enviadoRevision: boolean;
  evaluacion: EleccionEvaluacion;
  /** Formatos que emite otra área y el aspirante confirmó que sus datos son correctos (fecha ISO) */
  confirmados: Record<string, string>;
  /** Documentos firmados que un departamento publicó para el aspirante (p. ej. SIP-04) */
  recibidos: Record<string, ArchivoCargado>;
};

type Api = Estado & {
  cargado: boolean;
  ctx: Contexto;
  capturar: (id: string, valor: Valor) => void;
  /** Captura (o borra, con undefined) varios datos a la vez */
  capturarVarios: (valores: Record<string, Valor | undefined>) => void;
  subirFirmado: (clave: string, archivo: ArchivoCargado | null) => void;
  guardarDocumento: (id: string, archivo: ArchivoCargado | null) => void;
  enviarRevision: () => void;
  guardarEvaluacion: (cambios: Partial<EleccionEvaluacion>) => void;
  confirmarDatos: (clave: string, confirmado: boolean) => void;
  /** Solo cascarón: simula que el departamento publica el documento firmado */
  recibir: (clave: string, archivo: ArchivoCargado | null) => void;
  reiniciar: () => void;
};

export const CLAVE_REGISTRO = "sigap-aspirante-registro";
const CLAVE_EXPEDIENTE = "sigap-expediente";

const INICIAL: Omit<Estado, "registro"> = {
  capturas: {},
  firmados: {},
  documentos: {},
  enviadoRevision: false,
  evaluacion: { grupos: {} },
  confirmados: {},
  recibidos: {},
};

/** Acepta solo archivos válidos (descarta datos de versiones anteriores del cascarón). */
const soloArchivos = (x: unknown): Record<string, ArchivoCargado> =>
  Object.fromEntries(
    Object.entries((x ?? {}) as Record<string, unknown>).filter(([, v]) => !!v && typeof v === "object" && "nombre" in v),
  ) as Record<string, ArchivoCargado>;

const Ctx = createContext<Api | null>(null);

export function ExpedienteProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ registro: REGISTRO_DEMO, ...INICIAL });
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    try {
      const reg = localStorage.getItem(CLAVE_REGISTRO);
      const exp = localStorage.getItem(CLAVE_EXPEDIENTE);
      const guardado = exp ? JSON.parse(exp) : {};
      // Carga única desde localStorage al montar (no existe en el servidor)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado({
        registro: reg ? JSON.parse(reg) : REGISTRO_DEMO,
        capturas: guardado.capturas ?? {},
        firmados: soloArchivos(guardado.firmados),
        documentos: soloArchivos(guardado.documentos),
        enviadoRevision: !!guardado.enviadoRevision,
        evaluacion: { grupos: {}, ...(guardado.evaluacion ?? {}) },
        confirmados: guardado.confirmados ?? {},
        recibidos: soloArchivos(guardado.recibidos),
      });
    } catch {
      /* sin almacenamiento: se usan los datos de ejemplo */
    }
    setCargado(true);
  }, []);

  const actualizar = useCallback((fn: (e: Estado) => Estado) => {
    setEstado((prev) => {
      const nuevo = fn(prev);
      try {
        const { registro: _r, ...resto } = nuevo;
        void _r;
        localStorage.setItem(CLAVE_EXPEDIENTE, JSON.stringify(resto));
      } catch {
        /* p. ej. cuota llena: el estado sigue en memoria */
      }
      return nuevo;
    });
  }, []);

  const api = useMemo<Api>(() => {
    const ctx: Contexto = { r: estado.registro, c: estado.capturas, hoy: new Date() };
    return {
      ...estado,
      cargado,
      ctx,
      capturar: (id, valor) =>
        actualizar((e) => ({
          ...e,
          capturas: { ...e.capturas, [id]: valor },
          // Si cambian los datos, los PDF firmados ya subidos quedan desactualizados
          firmados: {},
        })),
      capturarVarios: (valores) =>
        actualizar((e) => {
          const capturas = { ...e.capturas };
          for (const [id, v] of Object.entries(valores)) {
            if (v === undefined) delete capturas[id];
            else capturas[id] = v;
          }
          return { ...e, capturas, firmados: {} };
        }),
      subirFirmado: (clave, archivo) =>
        actualizar((e) => {
          const firmados = { ...e.firmados };
          if (archivo) firmados[clave] = archivo;
          else delete firmados[clave];
          return { ...e, firmados };
        }),
      guardarDocumento: (id, archivo) =>
        actualizar((e) => {
          const docs = { ...e.documentos };
          if (archivo) docs[id] = archivo;
          else delete docs[id];
          return { ...e, documentos: docs, enviadoRevision: false };
        }),
      enviarRevision: () => actualizar((e) => ({ ...e, enviadoRevision: true })),
      guardarEvaluacion: (cambios) => actualizar((e) => ({ ...e, evaluacion: { ...e.evaluacion, ...cambios } })),
      confirmarDatos: (clave, confirmado) =>
        actualizar((e) => {
          const confirmados = { ...e.confirmados };
          const recibidos = { ...e.recibidos };
          if (confirmado) confirmados[clave] = new Date().toISOString();
          else {
            delete confirmados[clave];
            delete recibidos[clave];
          }
          return { ...e, confirmados, recibidos };
        }),
      recibir: (clave, archivo) =>
        actualizar((e) => {
          const recibidos = { ...e.recibidos };
          if (archivo) recibidos[clave] = archivo;
          else delete recibidos[clave];
          return { ...e, recibidos };
        }),
      reiniciar: () => actualizar((e) => ({ ...e, ...INICIAL })),
    };
  }, [estado, cargado, actualizar]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useExpediente() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExpediente debe usarse dentro de <ExpedienteProvider>");
  return v;
}
