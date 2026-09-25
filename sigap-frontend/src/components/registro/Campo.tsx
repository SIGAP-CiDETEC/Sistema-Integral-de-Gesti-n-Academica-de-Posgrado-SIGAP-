"use client";

import type { Pregunta } from "@/lib/registro-form";

type Props = {
  pregunta: Pregunta;
  valor: string | string[] | undefined;
  error?: string;
  onChange: (valor: string | string[]) => void;
};

const base =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Dibuja un campo del formulario según su tipo. */
export function Campo({ pregunta: p, valor, error, onChange }: Props) {
  const borde = error ? "border-red-400" : "border-gray-300";
  const texto = typeof valor === "string" ? valor : "";
  const lista = Array.isArray(valor) ? valor : [];
  const idError = `${p.id}-error`;

  let control: React.ReactNode;
  switch (p.tipo) {
    case "fijo":
      control = (
        <div
          id={p.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
        >
          {p.valorFijo}
          <span className="text-xs text-gray-500">Único programa en convocatoria</span>
        </div>
      );
      break;
    case "textarea":
      control = (
        <textarea
          id={p.id}
          rows={3}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          placeholder={p.placeholder ?? "Escribe tu respuesta"}
          aria-invalid={!!error}
          aria-describedby={error ? idError : undefined}
          className={`${base} ${borde} resize-y`}
        />
      );
      break;
    case "select":
      control = (
        <select
          id={p.id}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`${base} ${borde} ${texto ? "" : "text-gray-500"}`}
        >
          <option value="">Selecciona una opción</option>
          {p.opciones?.map((o) => (
            <option key={o} value={o} className="text-gray-900">
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case "radio":
      control = (
        <div role="radiogroup" aria-labelledby={`${p.id}-label`} className="flex flex-wrap gap-2">
          {p.opciones?.map((o) => {
            const activo = texto === o;
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  activo ? "border-primary bg-indigo-50 text-primary" : `${borde} bg-white hover:bg-gray-50`
                }`}
              >
                <input
                  type="radio"
                  name={p.id}
                  value={o}
                  checked={activo}
                  onChange={() => onChange(o)}
                  className="accent-[var(--color-primary)]"
                />
                {o}
              </label>
            );
          })}
        </div>
      );
      break;
    case "checkbox":
      control = (
        <div className="grid gap-2 sm:grid-cols-2">
          {p.opciones?.map((o) => {
            const activo = lista.includes(o);
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  activo ? "border-primary bg-indigo-50 text-primary" : `${borde} bg-white hover:bg-gray-50`
                }`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => onChange(activo ? lista.filter((x) => x !== o) : [...lista, o])}
                  className="accent-[var(--color-primary)]"
                />
                {o}
              </label>
            );
          })}
        </div>
      );
      break;
    default:
      control = (
        <input
          id={p.id}
          type={p.tipo === "email" ? "email" : p.tipo === "tel" ? "tel" : "text"}
          inputMode={p.tipo === "tel" ? "numeric" : undefined}
          value={texto}
          onChange={(e) => onChange(p.id === "curp" ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={p.placeholder ?? "Escribe tu respuesta"}
          maxLength={p.id === "curp" ? 18 : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? idError : undefined}
          className={`${base} ${borde}`}
        />
      );
  }

  return (
    <div className={p.ancho === "completo" ? "sm:col-span-2" : ""}>
      <label id={`${p.id}-label`} htmlFor={p.id} className="mb-1.5 block text-sm font-medium text-gray-900">
        {p.label} {p.requerido && <span className="text-red-600">*</span>}
      </label>
      {p.ayuda && <p className="-mt-1 mb-1.5 text-xs text-gray-500">{p.ayuda}</p>}
      {control}
      {error && (
        <p id={idError} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
