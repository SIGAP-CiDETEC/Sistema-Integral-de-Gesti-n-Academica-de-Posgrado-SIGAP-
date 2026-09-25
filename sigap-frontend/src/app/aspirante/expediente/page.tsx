import { redirect } from "next/navigation";

/** Ruta anterior: el expediente ahora vive en la fase 2 (Documentos). */
export default function ExpedienteAnterior() {
  redirect("/aspirante/documentos");
}
