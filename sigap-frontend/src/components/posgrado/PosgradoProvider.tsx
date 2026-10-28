"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { REGISTRO_DEMO, nombreCompleto } from "@/lib/aspirante-datos";
import { DOCUMENTOS } from "@/lib/documentos";
import type { ModalidadId } from "@/lib/evaluacion";
import {
  ASPIRANTES_BASE,
  fijarProfesores,
  type AspiranteP,
  type ProfesorP,
  type DocAspirante,
  type EstadoDoc,
  type ResolucionColegio,
  type SegundaOportunidad,
  type UteycvP,
} from "@/lib/posgrado/datos";
import { guardarCuenta, ID_TEMPORAL_DEMO, type CuentaAlumno } from "@/lib/cuenta-alumno";
import { siglasUnidad, type Respuestas } from "@/lib/registro-form";
import { useSesion } from "@/lib/sesion";
import { useProfesorActual } from "@/lib/profesor";
import type { ActaSip12 } from "@/lib/actas-sip12";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";
import { registroSintetico } from "@/lib/registro-aspirante";

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
  /** Hora de la sesión del Colegio (aparece en el SIP-04) */
  hora?: string;
  archivo?: string;
  resoluciones: Record<string, ResolucionColegio>;
  registradaEl: string;
  informeGeneradoEl?: string;
  /** Cuándo se registraron las resoluciones del acta (aún no las ve el aspirante) */
  resolucionRegistradaEl?: string;
  /** Cuándo Posgrado publicó los resultados a los aspirantes (a partir de la fecha de la convocatoria) */
  publicadoEl?: string;
};

type Estado = {
  cambios: Record<string, Partial<AspiranteP>>;
  docs: Record<string, Record<string, { estado: EstadoDoc; observacion?: string; prorrogaHasta?: string; el?: string; archivo?: string; resubido?: boolean }>>;
  bitacora: EntradaBitacora[];
  comunicados: Comunicado[];
  avisos: AvisoP[];
  acta?: ActaColegio;
  /** Actas SIP-12 de los cursos propedéuticos, por grupo (clave "materia-grupo") */
  actasSip12?: Record<string, ActaSip12>;
};

const CLAVE = "sigap-posgrado";
const VACIO: Estado = { cambios: {}, docs: {}, bitacora: [], comunicados: [], avisos: [] };

/** Con el servidor real: lo que Posgrado comparte (se guarda en el almacén "posgrado" del servidor). */
const compartidoDe = (e: Estado) => ({ comunicados: e.comunicados, avisos: e.avisos, acta: e.acta, actasSip12: e.actasSip12 });
/** Campos del avance del aspirante que el servidor acepta de Posgrado (los demás tienen sus propias acciones). */
const CAMPOS_PROCESO = ["etapa", "concluido", "promedioValidado", "evaluacion", "resolucion", "motivoReservas", "turnadoUteycv", "formatos", "dedicacion", "uteycv"];

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
  /** Registra el trabajo de UTEyCV (inscripción). Lo que toca al aspirante de este navegador se refleja en su sesión. */
  actualizarUteycv: (id: string, patch: Partial<UteycvP>, accion: string) => void;
  /** Deja constancia en bitácora de un cambio general (p. ej. fechas de evaluación) */
  registrarEnBitacora: (accion: string) => void;
  actasSip12: Record<string, ActaSip12>;
  /** El docente sube el SIP-12 firmado; se le envía un correo de confirmación. Devuelve false si ya estaba subida. */
  subirSip12Docente: (clave: string, curso: string, archivo: string, docente: { nombre: string; correo: string }) => boolean;
  /** El Coordinador del programa sube el SIP-12 con su firma. Devuelve false si no la ha subido el docente o ya estaba firmada. */
  subirSip12Coordinador: (clave: string, curso: string, archivo: string) => boolean;
  /** Respuestas del registro (primer formulario) del aspirante */
  registroDe: (id: string) => Respuestas;
  /** Lo que el aspirante capturó en sus formatos (solo el de este navegador) */
  capturasDe: (id: string) => Record<string, unknown>;
  avisos: AvisoP[];
  bitacora: EntradaBitacora[];
  comunicados: Comunicado[];
  acta?: ActaColegio;
  reiniciar: () => void;
  /** Con el servidor real: vuelve a leer los datos, reemplaza un aspirante con lo que respondió la API y el error de carga */
  recargar: () => Promise<void>;
  reemplazarAspirante: (a: AspiranteP) => void;
  errorCarga?: string;
};

const Ctx = createContext<Api | null>(null);

type ExpedienteLocal = {
  documentos?: Record<string, { nombre: string; fecha?: string }>;
  firmados?: Record<string, { nombre: string }>;
  confirmados?: Record<string, string>;
  recibidos?: Record<string, { nombre: string; fecha: string }>;
  capturas?: Record<string, unknown>;
  evaluacion?: { modalidad?: ModalidadId; grupos?: Record<string, string>; confirmadaEl?: string; segundaOportunidad?: SegundaOportunidad };
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
  const { profesor } = useProfesorActual();
  // En la sesión de Profesor, la bitácora queda a nombre del profesor con el que se actúa
  const usuario = (sesion?.rol === "profesor" && profesor ? profesor.nombre : sesion?.nombre) ?? "Departamento de Posgrado";

  // Servidor real: aspirantes, profesores y bitácora vienen de la API
  const [remoto, setRemoto] = useState<{ aspirantes: AspiranteP[]; bitacora: EntradaBitacora[]; error?: string }>({ aspirantes: [], bitacora: [] });
  const recargar = useCallback(async () => {
    try {
      const [aspirantes, profesores] = await Promise.all([api<AspiranteP[]>("/aspirantes"), api<ProfesorP[]>("/profesores")]);
      fijarProfesores(profesores);
      const personal = sesion?.rol === "posgrado" || sesion?.rol === "subdireccion";
      const [bitacora, compartido] = await Promise.all([
        sesion?.rol === "profesor" ? Promise.resolve([] as EntradaBitacora[]) : api<EntradaBitacora[]>("/bitacora").catch(() => []),
        personal ? api<{ valor: Partial<Estado> | null }>("/almacen/posgrado").catch(() => ({ valor: null })) : Promise.resolve({ valor: null }),
      ]);
      setRemoto({ aspirantes, bitacora });
      if (personal) {
        const e = { ...VACIO, ...(compartido.valor ?? {}) };
        estadoRef.current = e;
        setEstado(e);
      }
    } catch (e) {
      setRemoto((r) => ({ ...r, error: e instanceof Error ? e.message : "No se pudo conectar con el servidor" }));
    }
    setCargado(true);
  }, [sesion?.rol]);

  useEffect(() => {
    if (MODO_API) {
       
      void recargar();
      return;
    }
    // Carga única desde el navegador (no existe en el servidor)
     
    setEstado({ ...VACIO, ...(leerLocal<Estado>(CLAVE) ?? {}) });
    setVivo({
      registro: leerLocal<Respuestas>("sigap-aspirante-registro") ?? REGISTRO_DEMO,
      exp: leerLocal<ExpedienteLocal>("sigap-expediente") ?? {},
      cuenta: leerLocal<CuentaAlumno>("sigap-cuenta-alumno"),
    });
    setCargado(true);
  }, [recargar]);

  // Con el servidor real: lo que se registra en bitácora durante una acción se manda al servidor
  const estadoRef = useRef<Estado>(VACIO);
  const pendientes = useRef<{ accion: string; aspirante?: string }[]>([]);
  const refrescarBitacora = useCallback(async () => {
    const bitacora = await api<EntradaBitacora[]>("/bitacora").catch(() => null);
    if (bitacora) setRemoto((r) => ({ ...r, bitacora }));
  }, []);

  const guardar = useCallback((fn: (e: Estado) => Estado) => {
    if (MODO_API) {
      const previo = estadoRef.current;
      const nuevo = fn(previo);
      const acciones = pendientes.current.splice(0);
      estadoRef.current = nuevo;
      setEstado(nuevo);
      const cambio = JSON.stringify(compartidoDe(previo)) !== JSON.stringify(compartidoDe(nuevo));
      void (async () => {
        try {
          if (cambio) await api("/almacen/posgrado", { metodo: "PUT", cuerpo: { valor: compartidoDe(nuevo) } });
          for (const a of acciones) await api("/bitacora", { cuerpo: { accion: a.accion.slice(0, 1000), ...(a.aspirante ? { aspirante: a.aspirante } : {}) } });
        } catch (e) {
          notificar(`No se guardó en el servidor: ${mensajeDe(e)}`);
        }
        await refrescarBitacora();
      })();
      return;
    }
    setEstado((prev) => {
      const nuevo = fn(prev);
      try {
        localStorage.setItem(CLAVE, JSON.stringify(nuevo));
      } catch {
        /* ignorar */
      }
      return nuevo;
    });
  }, [refrescarBitacora]);

  const valor = useMemo<Api>(() => {
    const locales = () => ASPIRANTES_BASE.map((base) => {
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
          procedencia: r.institucion === "IPN" && r.unidadIpn ? `IPN — ${siglasUnidad(String(r.unidadIpn))}` : String(r.institucion ?? a.procedencia),
          promedio: String(r.promedio ?? a.promedio),
          documentos,
          formatos: Object.fromEntries(Object.keys(vivo.exp.firmados ?? {}).map((k) => [k, true])),
          evaluacion: ev?.confirmadaEl ? { modalidad: ev.modalidad, grupos: ev.grupos ?? {}, segundaOportunidad: ev.segundaOportunidad } : { grupos: {} },
          // Su último movimiento es el último archivo que subió
          ultimoMovimiento:
            Object.values(vivo.exp.documentos ?? {})
              .map((d) => d.fecha ?? "")
              .sort()
              .at(-1) || a.ultimoMovimiento,
        };
      }
      const cambios = { ...(estado.cambios[base.id] ?? {}) };
      // Datos guardados antes de renombrar "Condicionado" a "Con reservas"
      if ((cambios.resolucion as string) === "Condicionado") cambios.resolucion = "Con reservas";
      a = { ...a, ...cambios, evaluacion: { ...a.evaluacion, ...(cambios.evaluacion ?? {}) }, uteycv: { ...base.uteycv, ...cambios.uteycv } };
      // La decisión de la segunda oportunidad la toma el aspirante en su sesión
      if (base.enVivo && vivo.exp.evaluacion?.segundaOportunidad) a.evaluacion = { ...a.evaluacion, segundaOportunidad: vivo.exp.evaluacion.segundaOportunidad };
      if (!a.concluido && a.etapa === "evaluacion" && a.evaluacion.segundaOportunidad?.decision === "no" && !a.evaluacion.examen)
        a.concluido = "Decidió no presentar el examen de las áreas no acreditadas";
      if (base.enVivo) {
        // Lo que hizo el aspirante en su sesión (formatos de inscripción) y lo publicado para él
        const x = vivo.exp;
        const est = x.capturas?.estatus;
        // La dedicación la elige el aspirante al llenar su SIP-04
        a.dedicacion = est === "Tiempo completo" || est === "Tiempo parcial" ? est : undefined;
        a.uteycv = {
          ...a.uteycv,
          // Inscripción: lo que subió en su sesión y lo que Control Escolar le publicó
          foto: !!x.documentos?.foto,
          sip01Firmado: !!x.firmados?.["sip-01"],
          sip04Firmado: !!x.firmados?.["sip-04"],
          sip05Firmado: !!x.firmados?.["sip-05"],
          sip06Firmado: !!x.firmados?.["sip-06"],
          sip08Firmado: !!x.firmados?.["sip-08"],
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
          if (subidoEl && o.el && subidoEl > o.el && o.estado !== "prorroga") return { ...d, resubido: o.estado === "observado" || undefined };
          // Prórroga: aplica aunque no haya archivo; si el aspirante ya lo subió, vuelve a revisión
          if (o.estado === "prorroga") return d.archivo ? { ...d, estado: "pendiente", prorrogaHasta: o.prorrogaHasta, observacion: "Entregado dentro de la prórroga" } : { ...d, ...o };
          if (d.estado === "falta") return d;
          // Ejemplo: documento con prórroga que "se entregó" (solo cascarón)
          return { ...d, ...o, archivo: o.archivo ?? d.archivo ?? (o.estado === "pendiente" || o.estado === "aprobado" ? `${d.id}_entregado.pdf` : undefined) };
        });
      return a;
    });
    const aspirantes = MODO_API ? remoto.aspirantes : locales();

    const registrar = (e: Estado, accion: string, aspirante?: string): Estado => {
      // Con el servidor real la bitácora la guarda el servidor
      if (MODO_API) {
        pendientes.current.push({ accion, aspirante });
        return e;
      }
      return { ...e, bitacora: [{ fecha: new Date().toISOString(), usuario, aspirante, accion }, ...e.bitacora].slice(0, 300) };
    };

    /** Con el servidor real: aplica en pantalla, lo manda a la API y deja lo que responda el servidor. */
    const reemplazar = (a: AspiranteP) => setRemoto((r) => ({ ...r, aspirantes: r.aspirantes.map((x) => (x.id === a.id ? a : x)) }));
    const enServidor = async (id: string, local: Partial<AspiranteP>, peticion: () => Promise<AspiranteP>) => {
      setRemoto((r) => ({ ...r, aspirantes: r.aspirantes.map((x) => (x.id === id ? { ...x, ...local, ultimoMovimiento: new Date().toISOString() } : x)) }));
      try {
        reemplazar(await peticion());
        if (sesion?.rol !== "profesor") void refrescarBitacora();
      } catch (e) {
        notificar(mensajeDe(e));
        await recargar();
      }
    };
    const actualizarRemoto = (id: string, patch: Partial<AspiranteP>, accion: string) => {
      const a = aspirantes.find((x) => x.id === id);
      const limpio = Object.fromEntries(Object.entries(patch).filter(([k]) => CAMPOS_PROCESO.includes(k))) as Partial<AspiranteP>;
      if (Object.keys(limpio).length < Object.keys(patch).length) console.warn("Campos que no se guardan desde aquí:", Object.keys(patch).filter((k) => !CAMPOS_PROCESO.includes(k)));
      if (limpio.evaluacion) limpio.evaluacion = { ...(a?.evaluacion ?? { grupos: {} }), ...limpio.evaluacion };
      if (limpio.uteycv) limpio.uteycv = { ...(a?.uteycv ?? {}), ...limpio.uteycv };
      if (!Object.keys(limpio).length) {
        // Solo deja constancia (p. ej. "devolvió el expediente con observaciones")
        if (accion) void api("/bitacora", { cuerpo: { accion: accion.slice(0, 1000), aspirante: id } }).then(refrescarBitacora).catch((e) => notificar(mensajeDe(e)));
        return;
      }
      // El profesor solo captura calificaciones del propedéutico de sus grupos
      if (sesion?.rol === "profesor")
        return void enServidor(id, limpio, () => api<AspiranteP>(`/aspirantes/${id}/calificaciones`, { cuerpo: { evaluacion: limpio.evaluacion ?? a?.evaluacion, accion } }));
      return void enServidor(id, limpio, () => api<AspiranteP>(`/aspirantes/${id}/proceso`, { metodo: "PATCH", cuerpo: { patch: limpio, accion } }));
    };

    return {
      cargado,
      usuario,
      aspirantes,
      porId: (id) => aspirantes.find((a) => a.id === id),
      registroDe: (id) => {
        const a = aspirantes.find((x) => x.id === id);
        // Con el servidor real no se inventan respuestas de registro (el acta se llena en la entrevista)
        if (!a || MODO_API) return {};
        return a.enVivo ? vivo.registro : registroSintetico(a);
      },
      capturasDe: (id) => (aspirantes.find((x) => x.id === id)?.enVivo ? (vivo.exp.capturas ?? {}) : {}),
      actualizar: (id, patch, accion) =>
        MODO_API ? actualizarRemoto(id, patch, accion) :
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
        if (MODO_API) {
          if (estadoDoc === "falta") return;
          const a = aspirantes.find((x) => x.id === id);
          const textoProrroga = prorrogaHasta ? new Date(`${prorrogaHasta}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";
          const verboApi: Record<string, string> = { aprobado: "Aprobó:", observado: "Observó:", pendiente: "Regresó a revisión:", prorroga: `Dio prórroga hasta el ${textoProrroga} para entregar` };
          const accion = `${verboApi[estadoDoc]} ${doc?.nombre ?? docId}${observacion ? ` — “${observacion}”` : ""}`;
          const documentos = a?.documentos.map((d) => (d.id === docId ? { ...d, estado: estadoDoc, observacion, prorrogaHasta } : d));
          return void enServidor(id, documentos ? { documentos } : {}, () =>
            api<AspiranteP>(`/aspirantes/${id}/documentos/${docId}/revision`, { metodo: "PUT", cuerpo: { estado: estadoDoc, observacion, prorrogaHasta, accion } }),
          );
        }
        const verbo: Record<EstadoDoc, string> = {
          aprobado: "Aprobó",
          observado: "Observó",
          pendiente: "Regresó a revisión",
          prorroga: `Dio prórroga hasta el ${prorrogaHasta ? new Date(`${prorrogaHasta}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : ""} para`,
          falta: "Marcó como faltante",
        };
        guardar((e) =>
          registrar(
            {
              ...e,
              docs: {
                ...e.docs,
                // Conserva el archivo que el aspirante haya vuelto a subir
                [id]: { ...e.docs[id], [docId]: { estado: estadoDoc, observacion, prorrogaHasta, el: new Date().toISOString(), archivo: e.docs[id]?.[docId]?.archivo } },
              },
              cambios: { ...e.cambios, [id]: { ...e.cambios[id], ultimoMovimiento: new Date().toISOString() } },
            },
            `${verbo[estadoDoc]}${estadoDoc === "prorroga" ? " entregar" : ":"} ${doc?.nombre ?? docId}${observacion ? ` — “${observacion}”` : ""}`,
            id,
          ),
        );
      },
      cambiarEleccion: (id, modalidad, grupos, motivo) => {
        const a = aspirantes.find((x) => x.id === id);
        if (MODO_API)
          return actualizarRemoto(
            id,
            { evaluacion: { ...(a?.evaluacion ?? { grupos: {} }), modalidad, grupos } },
            `Cambió la elección de evaluación a ${modalidad === "examen" ? "solo examen" : "propedéutico"}${
              modalidad === "propedeutico" ? ` (${Object.entries(grupos).map(([m, g]) => `${m}: ${g}`).join(", ")})` : ""
            } — motivo: ${motivo}`,
          );
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
        if (MODO_API) return actualizarRemoto(id, { uteycv: patch }, accion);
        if (a?.enVivo) {
          // Se refleja en la sesión del aspirante de este navegador
          const exp = leerLocal<Record<string, unknown> & ExpedienteLocal>("sigap-expediente") ?? {};
          const recibidos = { ...(exp.recibidos ?? {}) };
          const ahora = new Date().toISOString();
          if (patch.sip08PublicadoEl) recibidos["sip-08"] = { nombre: "SIP-08_programa_individual.pdf", fecha: ahora };
          if (patch.sip08PublicadoEl) {
            const nuevo = { ...exp, recibidos: Object.fromEntries(Object.entries(recibidos).map(([k, v]) => [k, { bytes: 240_000, ...v }])) };
            try {
              localStorage.setItem("sigap-expediente", JSON.stringify(nuevo));
            } catch {
              /* ignorar */
            }
            setVivo((v) => ({ ...v, exp: { ...v.exp, recibidos } }));
          }
          // RF-30: el número de registro sustituye al ID temporal en la sesión del aspirante de este navegador
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
      actasSip12: estado.actasSip12 ?? {},
      subirSip12Docente: (clave, curso, archivo, docente) => {
        if (estado.actasSip12?.[clave]?.docente) return false;
        const el = new Date().toISOString();
        guardar((e) => {
          const sig: Estado = { ...e, actasSip12: { ...e.actasSip12, [clave]: { ...e.actasSip12?.[clave], docente: { archivo, el, por: docente.nombre, correo: docente.correo } } } };
          // Correo de confirmación al docente (con backend lo envía el servicio de correo)
          const subida = registrar(sig, `Subió el acta SIP-12 firmada de ${curso} (${archivo}); queda pendiente de la firma del Coordinador del programa`);
          const correo = { fecha: el, usuario: "SIGAP · correo automático", accion: `Envió correo de confirmación a ${docente.nombre} (${docente.correo}): se recibió su acta SIP-12 de ${curso}` };
          return { ...subida, bitacora: [correo, ...subida.bitacora].slice(0, 300) };
        });
        return true;
      },
      subirSip12Coordinador: (clave, curso, archivo) => {
        const a = estado.actasSip12?.[clave];
        if (!a?.docente || a.coordinador) return false;
        const el = new Date().toISOString();
        guardar((e) =>
          registrar(
            { ...e, actasSip12: { ...e.actasSip12, [clave]: { ...e.actasSip12?.[clave], coordinador: { archivo, el, por: usuario } } } },
            `Firmó como Coordinador del programa el acta SIP-12 de ${curso} (${archivo})`,
          ),
        );
        return true;
      },
      avisos: estado.avisos,
      guardarActa: (acta, accion) => guardar((e) => registrar({ ...e, acta: { ...acta, registradaEl: new Date().toISOString() } }, accion)),
      bitacora: MODO_API ? remoto.bitacora : estado.bitacora,
      recargar,
      reemplazarAspirante: (a) => setRemoto((r) => ({ ...r, aspirantes: r.aspirantes.map((x) => (x.id === a.id ? a : x)) })),
      errorCarga: remoto.error,
      comunicados: estado.comunicados,
      acta: estado.acta,
      reiniciar: () => guardar(() => VACIO),
    };
  }, [estado, vivo, cargado, usuario, guardar, remoto, recargar, refrescarBitacora, sesion?.rol]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePosgrado() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePosgrado debe usarse dentro de <PosgradoProvider>");
  return v;
}
