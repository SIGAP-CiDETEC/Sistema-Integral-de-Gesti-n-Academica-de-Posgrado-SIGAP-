"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { REGISTRO_DEMO } from "@/lib/aspirante-datos";
import { ID_EN_VIVO, claveDe, useAspiranteActivo } from "@/lib/aspirante-activo";
import { documentosDeFase } from "@/lib/documentos";
import { ASPIRANTES_BASE } from "@/lib/posgrado/datos";
import { registroSintetico } from "@/lib/registro-aspirante";
import type { Capturas, Contexto, Valor } from "@/lib/formatos";
import { useSesionColegio } from "@/lib/posgrado/revision";
import type { SegundaOportunidad } from "@/lib/posgrado/datos";
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

const ID_DOC_EXPEDIENTE: Record<string, string> = { acta: "acta-nacimiento" };
const ID_DOC_POSGRADO: Record<string, string> = { "acta-nacimiento": "acta" };

/**
 * Expediente inicial de un aspirante de ejemplo (perfil aparte, p. ej. ASP-2026-050): ya subió sus documentos y su
 * SIP-02 firmado y envió su expediente a revisión. SOLO CASCARÓN.
 */
function expedienteDeEjemplo(id: string): Estado | null {
  const a = ASPIRANTES_BASE.find((x) => x.id === id);
  if (!a) return null;
  const registro = registroSintetico(a);
  const aplican = new Set(documentosDeFase("documentos", registro).map((d) => d.id));
  const subido = (nombre: string) => ({ nombre, bytes: 250_000, fecha: "2026-02-21T10:00:00.000Z" });
  const documentos: Record<string, ArchivoCargado> = {};
  for (const d of a.documentos) {
    const k = ID_DOC_EXPEDIENTE[d.id] ?? d.id;
    if (d.archivo && aplican.has(k)) documentos[k] = subido(d.archivo);
  }
  const firmados = Object.fromEntries(Object.keys(a.formatos).map((k) => [k, subido(`${k.toUpperCase()}_firmado.pdf`)]));
  return { registro, ...INICIAL, documentos, firmados, enviadoRevision: true };
}

export function ExpedienteProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ registro: REGISTRO_DEMO, ...INICIAL });
  const [cargado, setCargado] = useState(false);
  // Aspirante con el que se usa el portal (el de este navegador o un perfil de ejemplo)
  const activo = useAspiranteActivo();
  const claveExp = claveDe(CLAVE_EXPEDIENTE, activo);

  useEffect(() => {
    try {
      const reg = activo === ID_EN_VIVO ? localStorage.getItem(CLAVE_REGISTRO) : null;
      const exp = localStorage.getItem(claveExp);
      const ejemplo = activo === ID_EN_VIVO ? null : expedienteDeEjemplo(activo);
      const guardado = exp ? JSON.parse(exp) : (ejemplo ?? {});
      // Carga desde localStorage al montar o al cambiar de aspirante (no existe en el servidor)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado({
        registro: ejemplo?.registro ?? (reg ? JSON.parse(reg) : REGISTRO_DEMO),
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
  }, [activo, claveExp]);

  const actualizar = useCallback((fn: (e: Estado) => Estado) => {
    setEstado((prev) => {
      const nuevo = fn(prev);
      try {
        const { registro: _r, ...resto } = nuevo;
        void _r;
        localStorage.setItem(claveExp, JSON.stringify(resto));
      } catch {
        /* p. ej. cuota llena: el estado sigue en memoria */
      }
      return nuevo;
    });
  }, [claveExp]);

  // Sesión del Colegio (la registra Posgrado): se usa solo ya cargado en el navegador, para no diferir del servidor
  const colegio = useSesionColegio();
  const api = useMemo<Api>(() => {
    const ctx: Contexto = { r: estado.registro, c: estado.capturas, hoy: new Date(), colegio: cargado ? colegio : null };
    return {
      ...estado,
      cargado,
      ctx,
      capturar: (id, valor) =>
        actualizar((e) => ({
          ...e,
          capturas: { ...e.capturas, [id]: valor },
          borradores: {},
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
          return { ...e, capturas, firmados: {}, borradores: {} };
        }),
      subirFirmado: (clave, archivo) =>
        actualizar((e) => {
          const firmados = { ...e.firmados };
          if (archivo) firmados[clave] = archivo;
          else delete firmados[clave];
          return { ...e, firmados };
        }),
      guardarDocumento: (id, archivo) => {
        // Perfil de ejemplo: la corrección de un documento observado le llega a Posgrado como "resubido"
        if (activo !== ID_EN_VIVO && archivo) avisarResubida(activo, ID_DOC_POSGRADO[id] ?? id, archivo);
        actualizar((e) => {
          const docs = { ...e.documentos };
          if (archivo) docs[id] = archivo;
          else delete docs[id];
          // Una vez enviado el expediente sigue enviado: reemplazar un documento observado no lo regresa a borrador
          return { ...e, documentos: docs };
        });
      },
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
  }, [estado, cargado, actualizar, colegio, activo]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useExpediente() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExpediente debe usarse dentro de <ExpedienteProvider>");
  return v;
}

/** SOLO CASCARÓN: registra en los datos de Posgrado que el aspirante de ejemplo volvió a subir un documento. */
function avisarResubida(id: string, docId: string, archivo: ArchivoCargado) {
  try {
    const e = JSON.parse(localStorage.getItem("sigap-posgrado") ?? "{}");
    const nombre = ASPIRANTES_BASE.find((a) => a.id === id);
    const doc = nombre?.documentos.find((d) => d.id === docId);
    const docs = { ...(e.docs ?? {}), [id]: { ...(e.docs?.[id] ?? {}), [docId]: { estado: "pendiente", el: archivo.fecha, archivo: archivo.nombre, resubido: true } } };
    const cambios = { ...(e.cambios ?? {}), [id]: { ...(e.cambios?.[id] ?? {}), ultimoMovimiento: archivo.fecha } };
    const bitacora = [
      { fecha: archivo.fecha, usuario: nombre?.nombre ?? id, aspirante: id, accion: `Volvió a subir ${doc?.nombre ?? docId} para atender la observación` },
      ...(e.bitacora ?? []),
    ].slice(0, 300);
    localStorage.setItem("sigap-posgrado", JSON.stringify({ ...e, docs, cambios, bitacora }));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event("sigap-posgrado"));
}

/** SOLO CASCARÓN: deja el perfil de ejemplo como venía (documento observado sin corregir). */
export function restablecerEjemplo(id: string) {
  try {
    localStorage.removeItem(claveDe(CLAVE_EXPEDIENTE, id));
    const e = JSON.parse(localStorage.getItem("sigap-posgrado") ?? "{}");
    const quitar = (o?: Record<string, unknown>) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== id));
    localStorage.setItem(
      "sigap-posgrado",
      JSON.stringify({ ...e, docs: quitar(e.docs), cambios: quitar(e.cambios), avisos: (e.avisos ?? []).filter((x: { aspirante?: string }) => x.aspirante !== id) }),
    );
  } catch {
    /* ignorar */
  }
  window.location.reload();
}
