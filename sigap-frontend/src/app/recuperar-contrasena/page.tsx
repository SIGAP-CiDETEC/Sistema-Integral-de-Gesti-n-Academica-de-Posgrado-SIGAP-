import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { Logos } from "@/components/Logos";
import { SolicitarEnlace } from "@/components/recuperar/SolicitarEnlace";
import { CONTACTO_CONTRASENAS } from "@/lib/config";

/**
 * ¿Olvidaste tu contraseña? Con el correo configurado en el servidor, SIGAP envía un enlace para restablecerla.
 * Si la cuenta no tiene correo (o no llega), la restablece el Administrador con una temporal que se cambia al entrar.
 */
export default function RecuperarContrasena() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logos size={56} />
          <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-primary">
            <KeyRound size={22} />
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">¿Olvidaste tu contraseña?</h1>
        </div>

        <SolicitarEnlace />

        <p className="mt-6 text-sm font-medium text-gray-900">¿No te llega el correo o tu cuenta no tiene correo registrado?</p>
        <div className="mt-3 flex gap-3 rounded-lg border border-gray-200 p-3 text-sm">
          <UserCog size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Escribe desde el correo que tienes registrado a {CONTACTO_CONTRASENAS.nombre} (
            <a className="text-primary underline" href={`mailto:${CONTACTO_CONTRASENAS.correo}?subject=${encodeURIComponent("SIGAP: restablecer mi contraseña")}`}>
              {CONTACTO_CONTRASENAS.correo}
            </a>
            ). Si eres aspirante, indica tu ID temporal (por ejemplo MTC-A2701).
          </span>
        </div>

        <div className="mt-5 flex gap-3 rounded-lg bg-indigo-50/70 p-3 text-sm text-gray-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Si te ayuda el Administrador, te dará una <b>contraseña temporal</b> y, al entrar, SIGAP te pedirá crear una nueva. Nadie del personal te pedirá tu contraseña: si alguien lo
            hace, no la compartas.
          </p>
        </div>
      </div>
      <Link href="/login" className="mt-6 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={15} /> Volver al inicio de sesión
      </Link>
    </div>
  );
}
