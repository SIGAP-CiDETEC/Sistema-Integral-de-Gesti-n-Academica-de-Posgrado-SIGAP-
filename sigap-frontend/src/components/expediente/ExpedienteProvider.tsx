"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { REGISTRO_DEMO } from "@/lib/aspirante-datos";
import type { Capturas, Contexto, Valor } from "@/lib/formatos";
import { useSesionColegio } from "@/lib/posgrado/revision";
import type { SegundaOportunidad } from "@/lib/posgrado/datos";
import type { Respuestas } from "@/lib/registro-form";
import { estaDocumentoValidado, cambiarArchivoProtegido } from "@/lib/bloqueo-documentos";
import { FORMATOS_ASPIRANTE } from "@/lib/formatos";

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
  /** Si no acreditó áreas del propedéutico: si quiere presentar el examen de esas áreas (RN-08) */
  segundaOportunidad?: SegundaOportunidad;
};

type Estado = {
  registro: Respuestas;
  capturas: Capturas;
  /** PDF autogenerado sin firma, pendiente de revisión del aspirante. */
  borradores: Record<string, ArchivoCargado>;
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
  borradores: {},
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
        borradores: soloArchivos(guardado.borradores),
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

  // Sesión del Colegio (la registra Posgrado): se usa solo ya cargado en el navegador, para no diferir del servidor
  const colegio = useSesionColegio();
  const api = useMemo<Api>(() => {
    const ctx: Contexto = { r: estado.registro, c: estado.capturas, hoy: new Date(), colegio: cargado ? colegio : null };
    return {
      ...estado,
      cargado,
      ctx,
      capturar: (id, valor) =>
        actualizar((e) => FORMATOS_ASPIRANTE.some((f) => estaDocumentoValidado(f.clave) && f.campos.some((c) => c.id === id)) ? e : ({
          ...e,
          capturas: { ...e.capturas, [id]: valor },
          borradores: {},
          // Si cambian los datos, los PDF firmados ya subidos quedan desactualizados
          firmados: Object.fromEntries(Object.entries(e.firmados).filter(([clave]) => estaDocumentoValidado(clave))),
        })),
      capturarVarios: (valores) =>
        actualizar((e) => {
          const capturas = { ...e.capturas };
          for (const [id, v] of Object.entries(valores)) {
            if (FORMATOS_ASPIRANTE.some((f) => estaDocumentoValidado(f.clave) && f.campos.some((c) => c.id === id))) continue;
            if (v === undefined) delete capturas[id];
            else capturas[id] = v;
          }
          return { ...e, capturas, firmados: Object.fromEntries(Object.entries(e.firmados).filter(([clave]) => estaDocumentoValidado(clave))), borradores: {} };
        }),
      subirFirmado: (clave, archivo) =>
        actualizar((e) => {
          if (estaDocumentoValidado(clave)) return e;
          const firmados = cambiarArchivoProtegido(e.firmados, clave, archivo, estaDocumentoValidado(clave));
          return { ...e, firmados };
        }),
      guardarDocumento: (id, archivo) =>
        actualizar((e) => {
          if (estaDocumentoValidado(id)) return e;
          const docs = cambiarArchivoProtegido(e.documentos, id, archivo, estaDocumentoValidado(id));
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
      reiniciar: () => actualizar((e) => FORMATOS_ASPIRANTE.some((f) => estaDocumentoValidado(f.clave)) || Object.keys({ ...e.documentos, ...e.firmados, ...e.recibidos }).some(estaDocumentoValidado) ? e : ({ ...e, ...INICIAL })),
    };
  }, [estado, cargado, actualizar, colegio]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useExpediente() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExpediente debe usarse dentro de <ExpedienteProvider>");
  return v;
}
