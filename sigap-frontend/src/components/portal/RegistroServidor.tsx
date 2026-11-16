"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Pencil, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";
import { recargarPortal } from "@/lib/portal";
import { Cargando, fechaLarga } from "./PortalComun";

type Datos = { nombres: string; apellidoPaterno: string; apellidoMaterno: string; curp: string; correo: string; telefono: string; procedencia: string; carrera: string; promedio: string };
type Registro = { idTemporal: string; enLinea: boolean; registradoEl: string | null; verificadoEl: string | null; datos: Datos };

const CAMPOS: { id: keyof Datos; label: string; ayuda?: string; max: number }[] = [
  { id: "nombres", label: "Nombre(s)", max: 80 },
  { id: "apellidoPaterno", label: "Apellido paterno", max: 80 },
  { id: "apellidoMaterno", label: "Apellido materno", max: 80 },
  { id: "curp", label: "CURP", ayuda: "18 caracteres (si eres extranjero, déjala vacía)", max: 18 },
  { id: "correo", label: "Correo electrónico", ayuda: "El de uso frecuente: ahí te contactará el Departamento de Posgrado", max: 120 },
  { id: "telefono", label: "Teléfono", ayuda: "10 dígitos", max: 20 },
  { id: "procedencia", label: "Institución o unidad académica de procedencia", max: 200 },
  { id: "carrera", label: "Licenciatura", max: 200 },
  { id: "promedio", label: "Promedio de licenciatura", ayuda: "Conforme a tu certificado de estudios", max: 10 },
];

/**
 * 1 · Registro (servidor real). Quien se registró en línea ve el resumen de su registro. Quien ya estaba en el sistema
 * (cargado por Posgrado) revisa sus datos, corrige lo necesario y confirma que son correctos; se guardan y quedan
 * registrados en la bitácora para Posgrado.
 */
export function RegistroServidor() {
  const [reg, setReg] = useState<Registro | null>(null);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api<Registro>("/portal/registro")
      .then((r) => {
        setReg(r);
        setDatos(r.datos);
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);
  if (!reg || !datos) return <Cargando error={error} />;

  const bloqueado = reg.enLinea || !!reg.verificadoEl;
  const confirmar = async () => {
    setGuardando(true);
    setError("");
    try {
      const r = await api<Registro>("/portal/registro/verificar", { cuerpo: datos });
      setReg(r);
      setDatos(r.datos);
      setEditando(false);
      notificar("Tus datos quedaron confirmados.", "exito");
      void recargarPortal();
    } catch (e) {
      setError(mensajeDe(e));
      // Algo falta o no es válido: se abren los campos para corregirlo
      setEditando(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <PageHeader titulo="Registro" subtitulo="Tus datos de registro en el proceso de admisión" />

      <div className="mb-5">
        {reg.enLinea ? (
          <Aviso tono="exito" titulo={`Te registraste en línea${reg.registradoEl ? ` el ${fechaLarga(reg.registradoEl)}` : ""}`}>
            Tu ID temporal es <strong className="font-mono">{reg.idTemporal}</strong>. Si necesitas corregir algún dato, escribe al Departamento de Posgrado.
          </Aviso>
        ) : reg.verificadoEl ? (
          <Aviso tono="exito" titulo={`Confirmaste tus datos el ${fechaLarga(reg.verificadoEl)}`}>
            Si necesitas corregir algo más, escribe al Departamento de Posgrado.
          </Aviso>
        ) : (
          <Aviso tono="info" titulo="Verifica tus datos">
            Revisa que tus datos sean correctos. Si alguno está mal o falta, elige «Corregir mis datos», cámbialo y confirma. Solo puedes hacerlo una vez.
          </Aviso>
        )}
      </div>

      <Tarjeta titulo="Mis datos" accion={<span className="font-mono text-sm text-gray-600">{reg.idTemporal}</span>}>
        {editando ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {CAMPOS.map((c) => (
              <label key={c.id} className="text-sm">
                <span className="font-medium text-gray-800">{c.label}</span>
                <input
                  value={datos[c.id]}
                  maxLength={c.max}
                  onChange={(e) => setDatos({ ...datos, [c.id]: c.id === "curp" ? e.target.value.toUpperCase() : e.target.value })}
                  className={`${inputBase} mt-1`}
                />
                {c.ayuda && <span className="mt-0.5 block text-xs text-gray-500">{c.ayuda}</span>}
              </label>
            ))}
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {CAMPOS.map((c) => (
              <div key={c.id}>
                <dt className="text-xs text-gray-500">{c.label}</dt>
                <dd className={`text-sm ${datos[c.id] ? "text-gray-900" : "italic text-gray-400"}`}>{datos[c.id] || "Sin registrar"}</dd>
              </div>
            ))}
          </dl>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!bloqueado && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {editando ? (
              <>
                <button type="button" onClick={confirmar} disabled={guardando} className={botonPrimario}>
                  {guardando ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Guardar y confirmar mis datos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDatos(reg.datos);
                    setEditando(false);
                    setError("");
                  }}
                  className={botonSecundario}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={confirmar} disabled={guardando} className={botonPrimario}>
                  {guardando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Mis datos son correctos
                </button>
                <button type="button" onClick={() => setEditando(true)} className={botonSecundario}>
                  <Pencil size={15} /> Corregir mis datos
                </button>
              </>
            )}
          </div>
        )}
      </Tarjeta>
    </>
  );
}
