"use client";

import Link from "next/link";
import { Bell, BellRing, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { CORREO_UTEYCV } from "@/lib/config";
import { useCuentaAlumno } from "@/lib/cuenta-alumno";
import { useAvisosAspirante } from "@/lib/posgrado/revision";
import { useEnviado } from "@/lib/recordatorios";
import { useExpediente } from "@/components/expediente/ExpedienteProvider";
import { RecordatoriosProgramados, useRecordatoriosAspirante } from "@/components/expediente/Recordatorios";

/** Avisos del aspirante. Con backend: GET /notificaciones (y el mismo aviso llega por correo, RNF-14). */
export function NotificacionesAspirante() {
  const { registro, cargado } = useExpediente();
  const { cuenta } = useCuentaAlumno();
  const recordatorios = useRecordatoriosAspirante().todos;
  const { enviado } = useEnviado();
  // Avisos de Posgrado + recordatorios automáticos que ya se enviaron, del más reciente al más antiguo
  const avisos = [
    ...useAvisosAspirante().map((a) => ({ ...a, automatico: false })),
    ...recordatorios.filter(enviado).map((r) => ({ id: r.id, fecha: r.cuando, canal: "ambos" as const, asunto: r.asunto, mensaje: r.mensaje, automatico: true })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pendientes = recordatorios.filter((r) => !enviado(r));
  if (!cargado) return null;
  const fecha = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const anteriores = [
    { titulo: "Resultado publicado", texto: "El Colegio de Profesores resolvió tu admisión. Con eso concluye tu proceso de admisión.", cuando: "Hace 2 semanas" },
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
              {a.automatico ? <BellRing size={15} /> : <Bell size={15} />} {a.asunto}
            </p>
            <span className="text-xs text-gray-500">
              {new Date(a.fecha).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} ·{" "}
              {a.automatico ? "Recordatorio automático" : "Departamento de Posgrado"}
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

      <RecordatoriosProgramados lista={pendientes} titulo="Próximos recordatorios" />

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
