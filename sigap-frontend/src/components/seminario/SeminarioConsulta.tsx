"use client";

import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SoloConsulta } from "@/components/subdireccion/SoloConsulta";
import { Aviso, Etiqueta, Tarjeta, botonSecundario } from "@/components/posgrado/ui";
import { MODO_API } from "@/lib/api";
import { descargarCsv } from "@/lib/csv";
import { detalleDe, diaSesion, diaSesionTitulo, porSesion, useSeminario } from "@/lib/seminario";
import { LugarSesion } from "./SeminarioPosgrado";

/** Seminario de Inducción para la Subdirección Académica: sesiones y quién presenta en cada horario (solo consulta). */
export function SeminarioConsulta() {
  const { datos, error } = useSeminario();
  if (!MODO_API)
    return (
      <>
        <PageHeader titulo="Seminario de inducción" />
        <Aviso tono="info" titulo="Disponible con el servidor">
          Esta sección funciona con el servidor de SIGAP.
        </Aviso>
      </>
    );
  if (!datos)
    return error ? (
      <Aviso tono="error" titulo="No se pudo cargar el seminario">
        {error}
      </Aviso>
    ) : (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" /> Cargando…
      </p>
    );

  const c = datos.config;
  const ocupados = datos.espacios.filter((e) => e.profesorId).length;
  const csv = () =>
    descargarCsv(
      `${c.titulo.replace(/\s+/g, "_")}.csv`,
      ["Día", "Horario", "Modalidad", "Lugar o enlace", "Profesor investigador", "Laboratorio"],
      datos.espacios.map((e) => [diaSesion(e.fecha), `${e.inicio} a ${e.fin}`, detalleDe(c, e.fecha).modalidad === "en-linea" ? "En línea" : "Presencial", detalleDe(c, e.fecha).lugar, e.profesor ?? "", e.laboratorio ?? ""]),
    );

  return (
    <>
      <PageHeader titulo={datos.publicado ? c.titulo : "Seminario de inducción"} subtitulo="Profesores investigadores que presentan su laboratorio a los aspirantes" />
      <SoloConsulta />
      {!datos.publicado ? (
        <Aviso tono="info" titulo="Aún no se publica">
          El Departamento de Posgrado todavía no publica las sesiones del seminario.
        </Aviso>
      ) : (
        <Tarjeta
          titulo={`${datos.espacios.length ? `${ocupados} de ${datos.espacios.length} horarios con profesor` : "Horarios"}`}
          accion={
            <span className="flex items-center gap-2">
              <Etiqueta tono={c.abierto ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>{c.abierto ? "Elección abierta" : "Elección cerrada"}</Etiqueta>
              <button type="button" onClick={csv} className={botonSecundario}>
                <Download size={15} /> Descargar CSV
              </button>
            </span>
          }
        >
          <div className="space-y-6">
            {porSesion(datos.espacios).map((s, i) => (
              <section key={s.fecha}>
                <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                  Sesión {i + 1} · {diaSesionTitulo(s.fecha)}
                  <LugarSesion c={c} fecha={s.fecha} />
                </h3>
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {s.espacios.map((e) => (
                    <li key={e.id} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <span className="font-mono text-gray-700">
                        {e.inicio}–{e.fin}
                      </span>
                      <span className={e.profesor ? "text-gray-900" : "italic text-gray-400"}>{e.profesor ?? "Sin profesor"}</span>
                      <span className="text-gray-600">{e.laboratorio ?? ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Tarjeta>
      )}
    </>
  );
}
