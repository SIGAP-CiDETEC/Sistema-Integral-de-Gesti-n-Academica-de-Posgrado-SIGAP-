import Link from "next/link";
import { ArrowLeft, GraduationCap, KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { Logos } from "@/components/Logos";
import { CONTACTO_CONTRASENAS } from "@/lib/config";

/**
 * ¿Olvidaste tu contraseña? Mientras SIGAP no envía correos, la contraseña se restablece con ayuda:
 * Posgrado (profesores) o el Administrador (personal) generan una temporal que se cambia al entrar.
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
          <p className="mt-1 text-sm text-gray-600">Por tu seguridad, la restablece el área que administra tu cuenta.</p>
        </div>

        <ul className="mt-6 space-y-3 text-sm">
          <li className="flex gap-3 rounded-lg border border-gray-200 p-3">
            <GraduationCap size={20} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <b className="block text-gray-900">Profesores</b>
              Escribe desde tu correo institucional a {CONTACTO_CONTRASENAS.nombre}, del Departamento de Posgrado (
              <a className="text-primary underline" href={`mailto:${CONTACTO_CONTRASENAS.correo}?subject=${encodeURIComponent("SIGAP: restablecer mi contraseña")}`}>
                {CONTACTO_CONTRASENAS.correo}
              </a>
              ), o acude a la oficina.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-gray-200 p-3">
            <UserCog size={20} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <b className="block text-gray-900">Personal de Posgrado, Subdirección y UTEyCV</b>
              Pídelo al Administrador del sistema.
            </span>
          </li>
        </ul>

        <div className="mt-5 flex gap-3 rounded-lg bg-indigo-50/70 p-3 text-sm text-gray-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Te darán una <b>contraseña temporal</b> y, al entrar, SIGAP te pedirá crear una nueva. Nadie del personal te pedirá tu contraseña: si alguien lo
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
