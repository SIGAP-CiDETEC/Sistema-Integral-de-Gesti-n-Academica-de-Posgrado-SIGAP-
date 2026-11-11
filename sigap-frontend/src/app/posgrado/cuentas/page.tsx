import { redirect } from "next/navigation";

/** Las cuentas ahora las atiende el Administrador (las contraseñas se recuperan por correo). */
export default function CuentasProfesores() {
  redirect("/posgrado");
}
