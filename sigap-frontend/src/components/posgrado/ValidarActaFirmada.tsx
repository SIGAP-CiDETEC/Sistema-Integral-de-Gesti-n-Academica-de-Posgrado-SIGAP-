"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { ArchivoServidor } from "@/components/ArchivoServidor";
import { useAccionesProfesor } from "@/components/profesor/useAccionesProfesor";
import { botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { MODO_API } from "@/lib/api";
import { actaPorValidar, fechaCorta, nombreProfesor, type AspiranteP } from "@/lib/posgrado/datos";
import { useSesion } from "@/lib/sesion";

/**
 * Validación del acta MTC-EC firmada que subió un profesor: Posgrado revisa que traiga las firmas de los 3 profesores
 * entrevistadores. Al validarla se aplica el dictamen; si la rechaza (con motivo), los profesores la vuelven a subir.
 */
export function ValidarActaFirmada({ a, compacto = false }: { a: AspiranteP; compacto?: boolean }) {
  const { validarActa } = useAccionesProfesor();
  const { sesion } = useSesion();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const acta = a.actaEntrevista;
  if (!acta?.firmada || !actaPorValidar(a)) return null;
  const sinodo = a.entrevista?.sinodo ?? [];
  const quien = sesion?.nombre ?? "Departamento de Posgrado";

  const ejecutar = async (aprobar: boolean) => {
    setTrabajando(true);
    if (await validarActa(a, aprobar, motivo.trim(), quien)) {
      setRechazando(false);
      setMotivo("");
    }
    setTrabajando(false);
  };

  return (
    <div className={`rounded-lg border border-sky-200 bg-sky-50/70 ${compacto ? "p-2.5" : "p-3"} text-left text-sm`}>
      <p className="flex items-center gap-1.5 font-medium text-sky-950">
        <ShieldAlert size={15} /> Acta firmada por validar
      </p>
      <p className="mt-0.5 text-xs text-sky-900">
        Subida por {nombreProfesor(acta.firmada.subidaPor)} el {fechaCorta(acta.firmada.el)}. Revisa que traiga las firmas de: {sinodo.map(nombreProfesor).join(", ")}.
      </p>
      {MODO_API && (
        <span className="mt-1 block">
          <ArchivoServidor ruta={`/aspirantes/${a.id}/acta/firmada`} texto="Abrir acta firmada" />
        </span>
      )}
      {rechazando ? (
        <div className="mt-2">
          <label className="text-xs text-gray-800">
            Motivo del rechazo (lo verán los profesores entrevistadores)
            <textarea
              rows={2}
              value={motivo}
              maxLength={500}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Falta la firma de …"
              className={`${inputBase} mt-1`}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={botonPrimario} disabled={motivo.trim().length < 5 || trabajando} onClick={() => ejecutar(false)}>
              <XCircle size={14} /> Rechazar acta
            </button>
            <button type="button" className={botonSecundario} disabled={trabajando} onClick={() => setRechazando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={botonPrimario} disabled={trabajando} onClick={() => ejecutar(true)}>
            <CheckCircle2 size={14} /> Validar: trae las 3 firmas
          </button>
          <button type="button" className={botonSecundario} disabled={trabajando} onClick={() => setRechazando(true)}>
            <XCircle size={14} /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
