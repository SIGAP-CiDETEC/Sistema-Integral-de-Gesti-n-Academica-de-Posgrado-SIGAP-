"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { REGISTRO_DEMO, nombreCompleto } from "@/lib/aspirante-datos";
import { DOCUMENTOS } from "@/lib/documentos";
import type { ModalidadId } from "@/lib/evaluacion";
import {
  ASPIRANTES_BASE,
  type AspiranteP,
  type DocAspirante,
  type EstadoDoc,
  type ResolucionColegio,
  type UteycvP,
} from "@/lib/posgrado/datos";
import { guardarCuenta, ID_TEMPORAL_DEMO, type CuentaAlumno } from "@/lib/cuenta-alumno";
import type { Respuestas } from "@/lib/registro-form";
import { useSesion } from "@/lib/sesion";

/**
 * Estado compartido del proceso de admisión para el personal: lo usan el Departamento de Posgrado
 * y Control Escolar (UTEyCV), cada quien con su sesión.
 *
 * Estado de trabajo del Departamento de Posgrado (solo cascarón, en el navegador).
 * Con backend, cada acción es una llamada a la API y la bitácora la escribe el servidor (RNF-11).
 * El aspirante ASP-2026-001 se arma con lo que se llenó en la sesión de aspirante de este navegador.
 */

export type EntradaBitacora = { fecha: string; usuario: string; aspirante?: string; accion: string };
export type Comunicado = {
  id: string;
  fecha: string;
  usuario: string;
  asunto: string;
  cuerpo: string;
  destinatarios: string[];
  grupo: string;
  adjuntos: string[];
};
/** Aviso individual al aspirante: por correo, como notificación en SIGAP, o ambos. */
export type Canal = "correo" | "sistema" | "ambos";
export const CANAL_TEXTO: Record<Canal, string> = { correo: "correo", sistema: "notificación en SIGAP", ambos: "correo y notificación en SIGAP" };
export type AvisoP = { id: string; fecha: string; usuario: string; aspirante: string; canal: Canal; asunto: string; mensaje: string };

export type ActaColegio = {
  numero: string;
  fecha: string;
  archivo?: string;
  resoluciones: Record<string, ResolucionColegio>;
  registradaEl: string;
  informeGeneradoEl?: string;
};

type Estado = {
  cambios: Record<string, Partial<AspiranteP>>;
  docs: Record<string, Record<string, { estado: EstadoDoc; observacion?: string; prorrogaHasta?: string; el?: string }>>;
  bitacora: EntradaBitacora[];
  comunicados: Comunicado[];
  avisos: AvisoP[];
  acta?: ActaColegio;
};

const CLAVE = "sigap-posgrado";
const VACIO: Estado = { cambios: {}, docs: {}, bitacora: [], comunicados: [], avisos: [] };

type Api = {
  cargado: boolean;
  usuario: string;
  aspirantes: AspiranteP[];
  porId: (id: string) => AspiranteP | undefined;
  actualizar: (id: string, patch: Partial<AspiranteP>, accion: string) => void;
  marcarDoc: (id: string, docId: string, estado: EstadoDoc, observacion?: string, prorrogaHasta?: string) => void;
  cambiarEleccion: (id: string, modalidad: ModalidadId, grupos: Record<string, string>, motivo: string) => void;
  enviarComunicado: (c: Omit<Comunicado, "id" | "fecha" | "usuario">) => void;
  guardarActa: (acta: Omit<ActaColegio, "registradaEl">, accion: string) => void;
  /** Aviso a uno o varios aspirantes (p. ej. cambio de horario o de entrevista) */
  enviarAviso: (aspirantes: string[], canal: Canal, asunto: string, mensaje: string) => void;
  /** Registra el trabajo de UTEyCV (SIP-04, SIP-08, matrícula). Lo que toca al aspirante de este navegador se refleja en su sesión. */
  actualizarUteycv: (id: string, patch: Partial<UteycvP>, accion: string) => void;
  /** Deja constancia en bitácora de un cambio general (p. ej. fechas de evaluación) */
  registrarEnBitacora: (accion: string) => void;
  avisos: AvisoP[];
  bitacora: EntradaBitacora[];
  comunicados: Comunicado[];
  acta?: ActaColegio;
  reiniciar: () => void;
};

const Ctx = createContext<Api | null>(null);

type ExpedienteLocal = {
  documentos?: Record<string, { nombre: string; fecha?: string }>;
  firmados?: Record<string, { nombre: string }>;
  confirmados?: Record<string, string>;
  recibidos?: Record<string, { nombre: string; fecha: string }>;
  capturas?: Record<string, unknown>;
  evaluacion?: { modalidad?: ModalidadId; grupos?: Record<string, string>; confirmadaEl?: string };
};

function leerLocal<T>(clave: string): T | null {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function PosgradoProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(VACIO);
  const [vivo, setVivo] = useState<{ registro: Respuestas; exp: ExpedienteLocal; cuenta: CuentaAlumno | null }>({ registro: REGISTRO_DEMO, exp: {}, cuenta: null });
  const [cargado, setCargado] = useState(false);
  const { sesion } = useSesion();
  const usuario = sesion?.nombre ?? "Departamento de Posgrado";

  useEffect(() => {
    // Carga única desde el navegador (no existe en el servidor)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ ...VACIO, ...(leerLocal<Estado>(CLAVE) ?? {}) });
    setVivo({
      registro: leerLocal<Respuestas>("sigap-aspirante-registro") ?? REGISTRO_DEMO,
      exp: leerLocal<ExpedienteLocal>("sigap-expediente") ?? {},
      cuenta: leerLocal<CuentaAlumno>("sigap-cuenta-alumno"),
    });
    setCargado(true);
  }, []);

  const guardar = useCallback((fn: (e: Estado) => Estado) => {
    setEstado((prev) => {
      const nuevo = fn(prev);
      try {
        localStorage.setItem(CLAVE, JSON.stringify(nuevo));
      } catch {
        /* ignorar */
      }
      return nuevo;
    });
  }, []);

  const api = useMemo<Api>(() => {
    const aspirantes = ASPIRANTES_BASE.map((base) => {
      let a: AspiranteP = { ...base };
      if (base.enVivo) {
        const r = vivo.registro;
        const ev = vivo.exp.evaluacion;
        const documentos: DocAspirante[] = DOCUMENTOS.filter((d) => d.fase === "documentos" && (d.aplica ? d.aplica(r) : true)).map((d) => {
          const subido = vivo.exp.documentos?.[d.id];
          const requerido = typeof d.requerido === "function" ? d.requerido(r) : d.requerido;
          return { id: d.id, nombre: d.nombre, archivo: subido?.nombre, estado: subido ? "pendiente" : "falta", opcional: !requerido };
        });
        a = {
          ...a,
          nombre: nombreCompleto(r) || a.nombre,
          curp: String(r.curp ?? a.curp),
          correo: String(r.correo ?? a.correo),
          telefono: String(r.telefono ?? a.telefono),
          procedencia: r.institucion === "IPN" && r.unidadIpn ? `IPN — ${String(r.unidadIpn)}` : String(r.institucion ?? a.procedencia),
          promedio: String(r.promedio ?? a.promedio),
          documentos,
          formatos: Object.fromEntries(Object.keys(vivo.exp.firmados ?? {}).map((k) => [k, true])),
          evaluacion: ev?.confirmadaEl ? { modalidad: ev.modalidad, grupos: ev.grupos ?? {} } : { grupos: {} },
          // Su último movimiento es el último archivo que subió
          ultimoMovimiento:
            Object.values(vivo.exp.documentos ?? {})
              .map((d) => d.fecha ?? "")
              .sort()
              .at(-1) || a.ultimoMovimiento,
        };
      }
      const cambios = estado.cambios[base.id] ?? {};
      a = { ...a, ...cambios, evaluacion: { ...a.evaluacion, ...(cambios.evaluacion ?? {}) }, uteycv: { ...base.uteycv, ...cambios.uteycv } };
      if (base.enVivo) {
        // Lo que hizo el aspirante en su sesión (confirmar SIP-04, subir firmados y foto) y lo publicado para él
        const x = vivo.exp;
        const est = x.capturas?.estatus;
        // La dedicación la elige el aspirante en su SIP-05
        a.dedicacion = est === "Tiempo completo" || est === "Tiempo parcial" ? est : undefined;
        a.uteycv = {
          ...a.uteycv,
          confirmoSip04: !!x.confirmados?.["sip-04"],
          sip01Firmado: !!x.firmados?.["sip-01"],
          sip08Firmado: !!x.firmados?.["sip-08"],
          foto: !!x.documentos?.foto,
          sip04PublicadoEl: x.recibidos?.["sip-04"]?.fecha,
          sip04Archivo: x.recibidos?.["sip-04"]?.nombre,
          sip08PublicadoEl: x.recibidos?.["sip-08"]?.fecha,
          sicep: vivo.cuenta?.numeroRegistro ?? a.uteycv?.sicep,
          formalizadoEl: vivo.cuenta?.asignadoEl ?? (vivo.cuenta ? a.uteycv?.formalizadoEl : undefined),
        };
      }
      const docs = estado.docs[base.id];
      if (docs)
        a.documentos = a.documentos.map((d) => {
          const o = docs[d.id];
          if (!o) return d;
          // El aspirante reemplazó el archivo después de la revisión: vuelve a "Por revisar"
          const subidoEl = base.enVivo ? vivo.exp.documentos?.[d.id]?.fecha : undefined;
          if (subidoEl && o.el && subidoEl > o.el && o.estado !== "prorroga") return d;
          // Prórroga: aplica aunque no haya archivo; si el aspirante ya lo subió, vuelve a revisión
          if (o.estado === "prorroga") return d.archivo ? { ...d, estado: "pendiente", prorrogaHasta: o.prorrogaHasta, observacion: "Entregado dentro de la prórroga" } : { ...d, ...o };
          if (d.estado === "falta") return d;
          // Ejemplo: documento con prórroga que "se entregó" (solo cascarón)
          return { ...d, ...o, archivo: d.archivo ?? (o.estado === "pendiente" || o.estado === "aprobado" ? `${d.id}_entregado.pdf` : undefined) };
        });
      return a;
    });

    const registrar = (e: Estado, accion: string, aspirante?: string): Estado => ({
      ...e,
      bitacora: [{ fecha: new Date().toISOString(), usuario, aspirante, accion }, ...e.bitacora].slice(0, 300),
    });

    return {
      cargado,
      usuario,
      aspirantes,
      porId: (id) => aspirantes.find((a) => a.id === id),
      actualizar: (id, patch, accion) =>
        guardar((e) =>
          registrar(
            {
              ...e,
              cambios: {
                ...e.cambios,
                [id]: {
                  ...e.cambios[id],
                  ...patch,
                  ultimoMovimiento: new Date().toISOString(),
                  ...(patch.evaluacion ? { evaluacion: { ...e.cambios[id]?.evaluacion, ...patch.evaluacion } } : {}),
                },
              },
            },
            accion,
            id,
          ),
        ),
      marcarDoc: (id, docId, estadoDoc, observacion, prorrogaHasta) => {
        const doc = aspirantes.find((a) => a.id === id)?.documentos.find((d) => d.id === docId);
        const verbo: Record<EstadoDoc, string> = {
          aprobado: "Aprobó",
          observado: "Observó",
          pendiente: "Regresó a revisión",
          aval: "Turnó a UTEyCV para aval de la DFLE",
          prorroga: `Dio prórroga hasta el ${prorrogaHasta ? new Date(`${prorrogaHasta}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : ""} para`,
          falta: "Marcó como faltante",
        };
        guardar((e) =>
          registrar(
            {
              ...e,
              docs: { ...e.docs, [id]: { ...e.docs[id], [docId]: { estado: estadoDoc, observacion, prorrogaHasta, el: new Date().toISOString() } } },
              cambios: { ...e.cambios, [id]: { ...e.cambios[id], ultimoMovimiento: new Date().toISOString() } },
            },
            `${verbo[estadoDoc]}${estadoDoc === "prorroga" ? " entregar" : ":"} ${doc?.nombre ?? docId}${observacion ? ` — “${observacion}”` : ""}`,
            id,
          ),
        );
      },
      cambiarEleccion: (id, modalidad, grupos, motivo) => {
        const a = aspirantes.find((x) => x.id === id);
        if (a?.enVivo) {
          // También se refleja en la sesión del aspirante de este navegador
          const exp = leerLocal<Record<string, unknown>>("sigap-expediente") ?? {};
          try {
            localStorage.setItem(
              "sigap-expediente",
              JSON.stringify({ ...exp, evaluacion: { modalidad, grupos, confirmadaEl: new Date().toISOString() } }),
            );
          } catch {
            /* ignorar */
          }
          setVivo((v) => ({ ...v, exp: { ...v.exp, evaluacion: { modalidad, grupos, confirmadaEl: new Date().toISOString() } } }));
        }
        guardar((e) =>
          registrar(
            {
              ...e,
              cambios: {
                ...e.cambios,
                [id]: { ...e.cambios[id], ultimoMovimiento: new Date().toISOString(), evaluacion: { ...e.cambios[id]?.evaluacion, modalidad, grupos } },
              },
            },
            `Cambió la elección de evaluación a ${modalidad === "examen" ? "solo examen" : "propedéutico"}${
              modalidad === "propedeutico" ? ` (${Object.entries(grupos).map(([m, g]) => `${m}: ${g}`).join(", ")})` : ""
            } — motivo: ${motivo}`,
            id,
          ),
        );
      },
      enviarComunicado: (c) =>
        guardar((e) =>
          registrar(
            {
              ...e,
              comunicados: [{ ...c, id: `COM-${String(e.comunicados.length + 1).padStart(3, "0")}`, fecha: new Date().toISOString(), usuario }, ...e.comunicados],
            },
            `Envió el comunicado “${c.asunto}” a ${c.destinatarios.length} aspirante(s)`,
          ),
        ),
      enviarAviso: (ids, canal, asunto, mensaje) =>
        guardar((e) => {
          const fecha = new Date().toISOString();
          const nuevos = ids.map((aspirante, i) => ({ id: `AV-${e.avisos.length + i + 1}`, fecha, usuario, aspirante, canal, asunto, mensaje }));
          let sig: Estado = { ...e, avisos: [...nuevos, ...e.avisos] };
          for (const id of ids) sig = registrar(sig, `Envió aviso por ${CANAL_TEXTO[canal]}: “${asunto}”`, id);
          return sig;
        }),
      actualizarUteycv: (id, patch, accion) => {
        const a = aspirantes.find((x) => x.id === id);
        if (a?.enVivo) {
          // Se refleja en la sesión del aspirante de este navegador
          const exp = leerLocal<Record<string, unknown> & ExpedienteLocal>("sigap-expediente") ?? {};
          const recibidos = { ...(exp.recibidos ?? {}) };
          const ahora = new Date().toISOString();
          if (patch.sip04PublicadoEl) recibidos["sip-04"] = { nombre: patch.sip04Archivo ?? "SIP-04_firmado.pdf", fecha: ahora };
          if (patch.sip08PublicadoEl) recibidos["sip-08"] = { nombre: "SIP-08_programa.pdf", fecha: ahora };
          if (patch.sip04PublicadoEl || patch.sip08PublicadoEl) {
            const nuevo = { ...exp, recibidos: Object.fromEntries(Object.entries(recibidos).map(([k, v]) => [k, { bytes: 240_000, ...v }])) };
            try {
              localStorage.setItem("sigap-expediente", JSON.stringify(nuevo));
            } catch {
              /* ignorar */
            }
            setVivo((v) => ({ ...v, exp: { ...v.exp, recibidos } }));
          }
          if (patch.formalizadoEl && patch.sicep) {
            const cuenta: CuentaAlumno = { numeroRegistro: patch.sicep, idTemporal: ID_TEMPORAL_DEMO, asignadoEl: patch.formalizadoEl };
            guardarCuenta(cuenta);
            setVivo((v) => ({ ...v, cuenta }));
          }
        }
        guardar((e) =>
          registrar(
            {
              ...e,
              cambios: {
                ...e.cambios,
                [id]: { ...e.cambios[id], ultimoMovimiento: new Date().toISOString(), uteycv: { ...e.cambios[id]?.uteycv, ...patch } },
              },
            },
            accion,
            id,
          ),
        );
      },
      registrarEnBitacora: (accion) => guardar((e) => registrar(e, accion)),
      avisos: estado.avisos,
      guardarActa: (acta, accion) => guardar((e) => registrar({ ...e, acta: { ...acta, registradaEl: new Date().toISOString() } }, accion)),
      bitacora: estado.bitacora,
      comunicados: estado.comunicados,
      acta: estado.acta,
      reiniciar: () => guardar(() => VACIO),
    };
  }, [estado, vivo, cargado, usuario, guardar]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePosgrado() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePosgrado debe usarse dentro de <PosgradoProvider>");
  return v;
}
