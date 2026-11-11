"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { Logos } from "@/components/Logos";
import { api } from "@/lib/api";

/** Crear una contraseña nueva con el enlace que SIGAP envió por correo. */
export default function RestablecerContrasena({ searchParams }: PageProps<"/restablecer-contrasena">) {
  const token = use(searchParams).token;
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const reglas = [
    { texto: "Al menos 10 caracteres", ok: nueva.length >= 10 },
    { texto: "Una mayúscula y una minúscula", ok: /[A-Z]/.test(nueva) && /[a-z]/.test(nueva) },
    { texto: "Al menos un número", ok: /\d/.test(nueva) },
    { texto: "Las dos contraseñas coinciden", ok: !!nueva && nueva === confirma },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reglas.every((r) => r.ok)) return setError("Tu nueva contraseña aún no cumple todos los requisitos.");
    setGuardando(true);
    try {
      const r = await api<{ usuario: string }>("/auth/restablecer", { cuerpo: { token, nueva } });
      setListo(r.usuario ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
      setGuardando(false);
    }
  }

  const caja = "mt-1.5 flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20";
  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void) => (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {etiqueta}
      </label>
      <div className={caja}>
        <Lock size={17} className="text-gray-500" />
        <input id={id} type={ver ? "text" : "password"} value={valor} onChange={(e) => (cambiar(e.target.value), setError(""))} className="w-full py-2.5 text-sm outline-none" autoComplete="new-password" />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logos size={56} />
          <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-primary">
            <KeyRound size={22} />
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Crea tu contraseña nueva</h1>
        </div>

        {typeof token !== "string" || token.length < 20 ? (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Este enlace no está completo. Ábrelo directamente desde el correo o{" "}
            <Link href="/recuperar-contrasena" className="underline">
              pide uno nuevo
            </Link>
            .
          </p>
        ) : listo !== null ? (
          <div role="status" className="mt-6 space-y-4 text-center text-sm text-gray-700">
            <p className="flex items-center justify-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 size={18} /> Tu contraseña se cambió.
            </p>
            <p>Por seguridad se cerraron tus sesiones abiertas. Entra con tu usuario{listo ? <b> {listo}</b> : ""} y tu contraseña nueva.</p>
            <Link href={`/login${listo ? `?usuario=${encodeURIComponent(listo)}` : ""}`} className="inline-block w-full rounded-lg bg-navy-950 py-2.5 font-medium text-white hover:bg-navy-800">
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {campo("nueva", "Nueva contraseña", nueva, setNueva)}
            {campo("confirma", "Confirma la nueva contraseña", confirma, setConfirma)}
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> {ver ? <EyeOff size={13} /> : <Eye size={13} />} Mostrar contraseñas
            </label>
            <ul className="space-y-1 text-xs">
              {reglas.map((r) => (
                <li key={r.texto} className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-700" : "text-gray-500"}`}>
                  {r.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />} {r.texto}
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}{" "}
                {/venció|ya se usó|no es válido/.test(error) && (
                  <Link href="/recuperar-contrasena" className="underline">
                    Pedir otro enlace
                  </Link>
                )}
              </p>
            )}
            <button type="submit" disabled={guardando} className="w-full rounded-lg bg-navy-950 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
      <Link href="/login" className="mt-6 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={15} /> Volver al inicio de sesión
      </Link>
    </div>
  );
}
