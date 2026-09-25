"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { Logos } from "@/components/Logos";
import { PROGRAMA_INDIVIDUAL_DEMO } from "@/lib/programa-individual";
import { ID_TEMPORAL_DEMO, guardarCuenta, leerCuenta, useCuentaAlumno } from "@/lib/cuenta-alumno";

/**
 * Cambio obligatorio de contraseña en el primer inicio de sesión como alumno (RF-30, RF-31).
 * CASCARÓN: la contraseña temporal es Cidetec#<últimos 4 del número de registro>.
 * Con backend: PATCH /auth/password (hash con bcrypt/argon2, invalida la temporal).
 */
export default function CambiarContrasena() {
  const router = useRouter();
  const { cuenta } = useCuentaAlumno();
  const numero = cuenta?.numeroRegistro ?? PROGRAMA_INDIVIDUAL_DEMO.noRegistro;
  const temporalEsperada = `Cidetec#${numero.slice(-4)}`;
  const [temporal, setTemporal] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");

  const reglas = [
    { texto: "Al menos 8 caracteres", ok: nueva.length >= 8 },
    { texto: "Una mayúscula y una minúscula", ok: /[A-Z]/.test(nueva) && /[a-z]/.test(nueva) },
    { texto: "Al menos un número", ok: /\d/.test(nueva) },
    { texto: "Distinta a la contraseña temporal", ok: !!nueva && nueva !== temporal },
    { texto: "Las dos contraseñas coinciden", ok: !!nueva && nueva === confirma },
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (temporal !== temporalEsperada) return setError("La contraseña temporal no es correcta. Revisa el correo que te enviamos.");
    if (!reglas.every((r) => r.ok)) return setError("Tu nueva contraseña aún no cumple todos los requisitos.");
    const actual = leerCuenta() ?? { numeroRegistro: numero, idTemporal: ID_TEMPORAL_DEMO, asignadoEl: new Date().toISOString() };
    guardarCuenta({ ...actual, contrasenaCambiadaEl: new Date().toISOString() });
    router.push("/alumno");
  }

  const input = "w-full py-2.5 text-sm outline-none";
  const caja =
    "mt-1.5 flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logos size={56} />
          <span className="mt-5 flex items-center gap-1.5 rounded-full bg-guinda-soft px-3 py-0.5 text-xs font-medium text-guinda">
            <KeyRound size={12} /> Primer inicio de sesión como alumno
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Cambia tu contraseña</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tu usuario ahora es <span className="font-mono font-semibold text-gray-900">{numero}</span>. Por seguridad, reemplaza la
            contraseña temporal que te enviamos por correo.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="temporal" className="text-sm font-medium text-gray-900">
              Contraseña temporal
            </label>
            <div className={caja}>
              <Lock size={17} className="text-gray-500" />
              <input id="temporal" type={ver ? "text" : "password"} value={temporal} onChange={(e) => (setTemporal(e.target.value), setError(""))} className={input} autoComplete="current-password" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Solo cascarón: es <span className="font-mono">{temporalEsperada}</span>{" "}
              <button type="button" onClick={() => setTemporal(temporalEsperada)} className="text-primary underline">
                usarla
              </button>
            </p>
          </div>
          <div>
            <label htmlFor="nueva" className="text-sm font-medium text-gray-900">
              Nueva contraseña
            </label>
            <div className={caja}>
              <KeyRound size={17} className="text-gray-500" />
              <input id="nueva" type={ver ? "text" : "password"} value={nueva} onChange={(e) => (setNueva(e.target.value), setError(""))} className={input} autoComplete="new-password" />
              <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseñas" : "Mostrar contraseñas"} className="text-gray-500 hover:text-gray-800">
                {ver ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirma" className="text-sm font-medium text-gray-900">
              Confirma la nueva contraseña
            </label>
            <div className={caja}>
              <KeyRound size={17} className="text-gray-500" />
              <input id="confirma" type={ver ? "text" : "password"} value={confirma} onChange={(e) => (setConfirma(e.target.value), setError(""))} className={input} autoComplete="new-password" />
            </div>
          </div>

          <ul className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs">
            {reglas.map((r) => (
              <li key={r.texto} className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-700" : "text-gray-500"}`}>
                {r.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />} {r.texto}
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" className="w-full rounded-lg bg-navy-950 py-2.5 text-sm font-medium text-white hover:bg-navy-800">
            Guardar y entrar
          </button>
        </form>
      </div>
    </div>
  );
}
