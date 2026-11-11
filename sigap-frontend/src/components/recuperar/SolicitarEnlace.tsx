"use client";

import { useEffect, useState } from "react";
import { AtSign, Loader2, MailCheck } from "lucide-react";
import { MODO_API, api } from "@/lib/api";

/** Pide por correo un enlace para restablecer la contraseña (solo si el servidor ya envía correos). */
export function SolicitarEnlace() {
  const [disponible, setDisponible] = useState<boolean | null>(MODO_API ? null : false);
  const [usuario, setUsuario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!MODO_API) return;
    api<{ disponible: boolean }>("/auth/recuperacion")
      .then((r) => setDisponible(r.disponible))
      .catch(() => setDisponible(false));
  }, []);

  if (!disponible) return <p className="mt-2 text-center text-sm text-gray-600">Por tu seguridad, la restablece el área que administra tu cuenta.</p>;

  if (enviado)
    return (
      <div role="status" className="mt-6 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <MailCheck size={20} className="mt-0.5 shrink-0" />
        <p>
          Si <b>{usuario.trim()}</b> corresponde a una cuenta con correo registrado, en unos minutos te llegará un enlace para crear una contraseña nueva. Vence
          en 30 minutos y sirve una sola vez. Revisa también la carpeta de correo no deseado.
        </p>
      </div>
    );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim()) return setError("Escribe tu correo o tu ID temporal.");
    setEnviando(true);
    setError("");
    try {
      await api("/auth/recuperar", { cuerpo: { usuario: usuario.trim() } });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-3" noValidate>
      <p className="text-sm text-gray-600">Escribe tu usuario y te enviaremos a tu correo registrado un enlace para crear una contraseña nueva.</p>
      <label htmlFor="usuario" className="block text-sm font-medium text-gray-900">
        Correo institucional o ID temporal
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <AtSign size={17} className="text-gray-500" />
        <input
          id="usuario"
          value={usuario}
          onChange={(e) => (setUsuario(e.target.value), setError(""))}
          placeholder="correo@ipn.mx o MTC-A2701"
          autoComplete="username"
          className="w-full py-2.5 text-sm outline-none"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60">
        {enviando && <Loader2 size={15} className="animate-spin" />} Enviarme el enlace
      </button>
    </form>
  );
}
