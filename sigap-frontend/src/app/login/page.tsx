"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, AtSign, Eye, EyeOff, Lock, LogIn, ShieldCheck } from "lucide-react";
import { Logos } from "@/components/Logos";
import { PERIODO_ESCOLAR } from "@/lib/config";
import { leerCuenta } from "@/lib/cuenta-alumno";
import { USUARIOS_DEMO, autenticar, iniciarSesion } from "@/lib/sesion";

/**
 * Login único para todos los usuarios. El campo acepta:
 * - ID temporal de aspirante (ASP-2026-001)          → CU-ADM-01
 * - Número de registro SICEP / boleta (B260842)      → RF-30, RN-12
 * - Correo institucional (@ipn.mx)                  → RF-32 (personal: cada quien con su cuenta)
 *
 * CASCARÓN: aspirantes/alumnos entran con cualquier contraseña; el personal usa las
 * cuentas de USUARIOS_DEMO (src/lib/sesion.ts), cada una con su contraseña. Se decide el destino según el formato
 * del usuario; cuando exista NestJS, esto se reemplaza por POST /auth/login.
 */
function destinoSimulado(usuario: string, password: string): { ruta: string } | { error: string } {
  const u = usuario.trim().toUpperCase();
  if (u.includes("@")) {
    // Personal: credenciales únicas por usuario
    const cuentaPersonal = autenticar(usuario, password);
    if (!cuentaPersonal) return { error: "Correo o contraseña incorrectos." };
    iniciarSesion(cuentaPersonal);
    return { ruta: `/${cuentaPersonal.rol}` };
  }
  const cuenta = leerCuenta();
  if (u.startsWith("ASP-")) {
    // RF-30: con número SICEP asignado, el ID temporal deja de servir para entrar
    if (cuenta) return { error: `Tu ID temporal ya no es válido. Ahora inicias sesión con tu número de registro ${cuenta.numeroRegistro}.` };
    return { ruta: "/aspirante" };
  }
  if (/^[A-Z]?\d{6,}$/.test(u)) {
    // Primer inicio de sesión como alumno: debe cambiar la contraseña temporal
    if (cuenta && u === cuenta.numeroRegistro.toUpperCase() && !cuenta.contrasenaCambiadaEl) return { ruta: "/cambiar-contrasena" };
    return { ruta: "/alumno" };
  }
  return { error: "Usuario no reconocido. Usa tu correo institucional, tu ID temporal o tu número de registro." };
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const inicial = use(searchParams).usuario;
  const router = useRouter();
  const [usuario, setUsuario] = useState(typeof inicial === "string" ? inicial : "");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }
    const destino = destinoSimulado(usuario, password);
    if ("error" in destino) setError(destino.error);
    else router.push(destino.ruta);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-navy-800">
        <span className="h-1.5 w-1.5 rounded-full bg-guinda" />
        SIGAP · PERIODO ESCOLAR {PERIODO_ESCOLAR}
      </span>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logos size={64} />
          <span className="mt-5 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-primary">
            Portal de Aspirantes, Alumnos y Docentes
          </span>
          <h1 className="mt-3 text-xl font-semibold leading-snug text-gray-900">
            Sistema Integral de Gestión Académica de Posgrado
          </h1>
          <p className="mt-1 text-sm text-gray-600">CIDETEC – Instituto Politécnico Nacional</p>
        </div>

        <hr className="my-6 border-gray-200" />

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="usuario" className="text-sm font-medium text-gray-900">
              Usuario <span className="text-red-600">*</span>
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <AtSign size={17} className="text-gray-500" />
              <input
                id="usuario"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  setError("");
                }}
                placeholder="correo@ipn.mx, ASP-2026-001 o boleta"
                autoComplete="username"
                className="w-full py-2.5 text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Correo institucional, ID temporal de aspirante o número de registro.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-900">
              Contraseña <span className="text-red-600">*</span>
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Lock size={17} className="text-gray-500" />
              <input
                id="password"
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="current-password"
                className="w-full py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="text-gray-500 hover:text-gray-800"
              >
                {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              Recordar sesión
            </label>
            <a href="#" className="text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 py-2.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            Iniciar sesión <LogIn size={16} />
          </button>
        </form>

        <div className="mt-6 flex gap-3 rounded-lg bg-indigo-50/70 p-3 text-sm text-gray-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Acceso exclusivo para la comunidad académica y de posgrado de CIDETEC. Sus credenciales
            son personales e intransferibles.
          </p>
        </div>

        {/* Solo para el cascarón: accesos de prueba */}
        <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
          <p className="text-center text-xs text-gray-500">Acceso de prueba (solo cascarón)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <Link href="/aspirante" className="rounded-md border border-gray-200 py-1.5 text-center hover:bg-gray-50">
              Aspirante
            </Link>
            <Link href="/alumno" className="rounded-md border border-gray-200 py-1.5 text-center hover:bg-gray-50">
              Alumno
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">Cuentas del personal (cada una con su contraseña):</p>
          <ul className="mt-1.5 space-y-1.5 text-xs">
            {USUARIOS_DEMO.map((u) => (
              <li key={u.correo} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-800">{u.puesto}</span>
                  <span className="block truncate font-mono text-gray-500">
                    {u.correo} · {u.contrasena}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUsuario(u.correo);
                    setPassword(u.contrasena);
                    setError("");
                  }}
                  className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-gray-700 hover:bg-gray-50"
                >
                  Usar
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link href="/" className="mt-6 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={15} /> Volver al inicio
      </Link>
    </div>
  );
}
