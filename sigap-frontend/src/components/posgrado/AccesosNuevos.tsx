"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, KeyRound, Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe } from "@/lib/avisos-ui";
import { descargarCsv, fechaArchivo } from "@/lib/csv";
import { botonPrimario, botonSecundario } from "./ui";

type Pendiente = { folio: string; idTemporal: string; nombre: string; correo: string; telefono: string; registradoEl: string; accesoGeneradoEl: string | null };
type Generado = { idTemporal: string; nombre: string; correo: string; telefono: string; contrasena: string };

const fecha = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Aspirantes que se registraron en línea y aún no entran a SIGAP. Mientras el correo automático no esté activo,
 * Posgrado genera su contraseña temporal y se la envía (por correo institucional o teléfono). Solo se muestra una vez.
 */
export function AccesosNuevos() {
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [generados, setGenerados] = useState<Generado[] | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    api<Pendiente[]>("/aspirantes-accesos")
      .then((l) => {
        setLista(l);
        setElegidos(new Set(l.filter((x) => !x.accesoGeneradoEl).map((x) => x.folio)));
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (MODO_API) cargar();
  }, [cargar]);

  if (!MODO_API || (!lista.length && !generados)) return null;

  const generar = async () => {
    if (!elegidos.size) return;
    const regenera = lista.filter((x) => elegidos.has(x.folio) && x.accesoGeneradoEl).length;
    if (regenera && !window.confirm(`${regenera} aspirante(s) ya tenían contraseña generada; la anterior dejará de funcionar. ¿Continuar?`)) return;
    setTrabajando(true);
    setError("");
    try {
      setGenerados(await api<Generado[]>("/aspirantes-accesos", { cuerpo: { folios: [...elegidos] } }));
      cargar();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setTrabajando(false);
    }
  };
  const csv = (g: Generado[]) =>
    descargarCsv(`accesos-aspirantes-${fechaArchivo()}.csv`, ["Usuario (ID temporal)", "Nombre", "Correo", "Teléfono", "Contraseña temporal"], g.map((x) => [x.idTemporal, x.nombre, x.correo, x.telefono, x.contrasena]));

  return (
    <section className="mb-5 rounded-xl border border-indigo-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <UserPlus size={16} /> Registros en línea sin acceso a SIGAP ({lista.length})
        </h2>
        <p className="text-xs text-gray-600">Genera su contraseña temporal y envíasela; al entrar, SIGAP les pide cambiarla.</p>
      </header>

      {generados && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Estas contraseñas solo se muestran ahora. Descarga el CSV, envíaselas a cada aspirante y después borra el archivo.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="py-1 pr-3">Usuario</th>
                  <th className="py-1 pr-3">Nombre</th>
                  <th className="py-1 pr-3">Correo</th>
                  <th className="py-1">Contraseña temporal</th>
                </tr>
              </thead>
              <tbody>
                {generados.map((g) => (
                  <tr key={g.idTemporal} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-mono">{g.idTemporal}</td>
                    <td className="py-1.5 pr-3">{g.nombre}</td>
                    <td className="py-1.5 pr-3">{g.correo}</td>
                    <td className="py-1.5 font-mono">{g.contrasena}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={botonPrimario} onClick={() => csv(generados)}>
              <Download size={15} /> Descargar CSV
            </button>
            <button type="button" className={botonSecundario} onClick={() => setGenerados(null)}>
              Ocultar contraseñas
            </button>
          </div>
        </div>
      )}

      {!!lista.length && (
        <div className="px-4 py-3">
          <ul className="divide-y divide-gray-100 text-sm">
            {lista.map((x) => (
              <li key={x.folio} className="flex flex-wrap items-center gap-3 py-2">
                <input
                  type="checkbox"
                  aria-label={`Elegir a ${x.nombre}`}
                  checked={elegidos.has(x.folio)}
                  onChange={(e) => {
                    const n = new Set(elegidos);
                    if (e.target.checked) n.add(x.folio);
                    else n.delete(x.folio);
                    setElegidos(n);
                  }}
                />
                <span className="font-mono text-gray-700">{x.idTemporal}</span>
                <span className="min-w-0 flex-1 truncate text-gray-900">{x.nombre}</span>
                <span className="text-xs text-gray-500">{x.correo}</span>
                <span className={`text-xs ${x.accesoGeneradoEl ? "text-emerald-700" : "text-amber-700"}`}>
                  {x.accesoGeneradoEl ? `Contraseña generada ${fecha(x.accesoGeneradoEl)}` : `Se registró ${fecha(x.registradoEl)}`}
                </span>
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button type="button" className={`${botonPrimario} mt-3`} disabled={!elegidos.size || trabajando} onClick={generar}>
            {trabajando ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Generar contraseña temporal ({elegidos.size})
          </button>
        </div>
      )}
    </section>
  );
}
