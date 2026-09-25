"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Circle, IdCard, LogIn, RotateCcw, Wand2 } from "lucide-react";
import { useExpediente } from "@/components/expediente/ExpedienteProvider";
import { PROGRAMA_INDIVIDUAL_DEMO } from "@/lib/programa-individual";
import { ID_TEMPORAL_DEMO, guardarCuenta, useCuentaAlumno } from "@/lib/cuenta-alumno";

/**
 * Cierre del proceso (RF-29 a RF-31, RN-12): UTEyCV registra el número SICEP,
 * la boleta reemplaza al ID temporal y se notifica al alumno.
 */
export function BoletaSicep() {
  const { cuenta, cargado } = useCuentaAlumno();
  const { firmados, documentos } = useExpediente();
  if (!cargado) return null;

  const pendientes = [
    { texto: "Fotografía", hecho: !!documentos.foto },
    { texto: "SIP-01 firmado", hecho: !!firmados["sip-01"] },
    { texto: "SIP-08 firmado", hecho: !!firmados["sip-08"] },
  ];

  if (cuenta) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm">
        <p className="flex items-center gap-2 font-semibold text-emerald-800">
          <CheckCircle2 size={18} /> ¡Tu inscripción concluyó!
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">Tu número de registro (boleta)</p>
            <p className="font-mono text-xl font-semibold tracking-wider text-gray-900">{cuenta.numeroRegistro}</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">ID temporal</p>
            <p className="font-mono text-xl text-gray-400 line-through">{cuenta.idTemporal}</p>
          </div>
        </div>
        <p className="mt-3 text-gray-700">
          A partir de ahora inicias sesión con tu número de registro. Te enviamos una contraseña temporal a tu correo; la
          primera vez que entres te pediremos cambiarla.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/login?usuario=${cuenta.numeroRegistro}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover"
          >
            <LogIn size={15} /> Cerrar sesión e ingresar como alumno
          </Link>
          <Link
            href="/aspirante/notificaciones"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Bell size={15} /> Ver notificación
          </Link>
        </div>
        <Demo>
          <button type="button" onClick={() => guardarCuenta(null)} className={botonDemo}>
            <RotateCcw size={12} /> Deshacer (volver a ser aspirante)
          </button>
        </Demo>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm">
      <div className="flex gap-3">
        <IdCard size={20} className="shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-gray-900">Tu boleta definitiva</p>
          <p className="mt-1 text-gray-700">
            Cuando Control Escolar (UTEyCV) valide tu inscripción y registre tu número SICEP, tu boleta reemplazará al ID
            temporal para iniciar sesión (RF-30, RN-12). Tus documentos y formatos se conservan (RNF-07).
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {pendientes.map((p) => (
              <li key={p.texto} className={`flex items-center gap-1.5 ${p.hecho ? "text-emerald-700" : "text-gray-500"}`}>
                {p.hecho ? <CheckCircle2 size={14} /> : <Circle size={14} />} {p.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Demo>
        <button
          type="button"
          onClick={() =>
            guardarCuenta({
              numeroRegistro: PROGRAMA_INDIVIDUAL_DEMO.noRegistro,
              idTemporal: ID_TEMPORAL_DEMO,
              asignadoEl: new Date().toISOString(),
            })
          }
          className={botonDemo}
        >
          <Wand2 size={12} /> Simular que UTEyCV registra tu número SICEP
        </button>
      </Demo>
    </section>
  );
}

const botonDemo =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50";

function Demo({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-dashed border-gray-300 pt-3">
      <p className="mb-2 text-xs text-gray-500">Vista de prueba (solo cascarón):</p>
      {children}
    </div>
  );
}
