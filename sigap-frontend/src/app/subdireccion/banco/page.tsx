import { redirect } from "next/navigation";

/** Dirección anterior: el banco ahora está dentro de "Examen en línea". */
export default function Page() {
  redirect("/subdireccion/examen");
}
