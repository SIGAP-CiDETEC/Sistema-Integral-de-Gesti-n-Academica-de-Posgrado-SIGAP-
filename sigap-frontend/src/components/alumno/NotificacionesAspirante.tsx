"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Info, KeyRound, Mail } from "lucide-react";
import { useAvisosAspirante } from "@/lib/posgrado/revision";
import { CORREO_UTEYCV } from "@/lib/config";
import { useCuentaAlumno } from "@/lib/cuenta-alumno";
import { useExpediente } from "@/components/expediente/ExpedienteProvider";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Avisos del aspirante. Con backend: GET /notificaciones (y el mismo aviso llega por correo, RNF-14). */
export function NotificacionesAspirante() {
  const { cuenta, cargado } = useCuentaAlumno();
  const { registro } = useExpediente();
  const avisos = useAvisosAspirante();
  if (!cargado) return null;

  const anteriores = [
    { titulo: "Dictamen favorable", texto: "La Comisión de Admisión emitió tu dictamen (SIP-04). Ya puedes continuar con tu matrícula.", cuando: "Hace 2 semanas" },
    { titulo: "Resultado de evaluación", texto: "Acreditaste los cursos propedéuticos.", cuando: "Hace 3 semanas" },
    { titulo: "Entrevista confirmada", texto: "18 de marzo, 10:30 h. Sala de juntas CIDETEC.", cuando: "Hace 2 meses" },
  ];

  return (
    <div className="space-y-4">
      {cuenta && (
        <article className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={16} /> Concluyó tu inscripción · tu número de registro es {cuenta.numeroRegistro}
            </p>
            <span className="text-xs text-emerald-700">Nuevo · {fecha(cuenta.asignadoEl)}</span>
          </header>
          <div className="px-5 py-4 text-sm text-gray-700">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail size={13} /> También se envió a {String(registro.correo ?? "tu correo")} · De: Control Escolar (UTEyCV) &lt;{CORREO_UTEYCV}&gt;
            </p>
            <div className="mt-3 space-y-2">
              <p>Hola {String(registro.nombre ?? "")}:</p>
              <p>
                Control Escolar registró tu número SICEP. Tu proceso de admisión e inscripción ha concluido y ya eres alumno(a) de la
                Maestría en Tecnología de Cómputo.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Tu usuario ahora es tu número de registro: <span className="font-mono font-semibold">{cuenta.numeroRegistro}</span>.
                </li>
                <li>
                  Tu ID temporal <span className="font-mono">{cuenta.idTemporal}</span> dejó de ser válido para iniciar sesión.
                </li>
                <li>
                  Contraseña temporal: <span className="font-mono">Cidetec#{cuenta.numeroRegistro.slice(-4)}</span>. Por seguridad, al
                  iniciar sesión deberás cambiarla.
                </li>
                <li>Tus documentos y formatos de admisión se conservan en tu expediente.</li>
              </ul>
            </div>
            <Link
              href={`/login?usuario=${cuenta.numeroRegistro}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover"
            >
              <KeyRound size={15} /> Iniciar sesión y cambiar mi contraseña
            </Link>
          </div>
        </article>
      )}

      {avisos.map((a) => (
        <article key={a.id} className="overflow-hidden rounded-xl border border-indigo-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Bell size={15} /> {a.asunto}
            </p>
            <span className="text-xs text-gray-500">
              {new Date(a.fecha).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · Departamento de Posgrado
            </span>
          </header>
          <div className="whitespace-pre-line px-5 py-4 text-sm text-gray-700">{a.mensaje}</div>
          {a.canal === "ambos" && (
            <p className="flex items-center gap-1.5 border-t border-gray-100 px-5 py-2 text-xs text-gray-500">
              <Mail size={12} /> También se envió a {String(registro.correo ?? "tu correo")}
            </p>
          )}
        </article>
      ))}

      {!cuenta && (
        <p className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600">
          <Info size={16} /> Cuando UTEyCV registre tu número SICEP te llegará aquí el aviso para iniciar sesión como alumno. Puedes
          simularlo desde la fase 6 · Matrícula.
        </p>
      )}

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {anteriores.map((n) => (
          <li key={n.titulo} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">{n.titulo}</p>
              <p className="text-gray-600">{n.texto}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-400">{n.cuando}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
