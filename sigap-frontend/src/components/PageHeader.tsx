import { Bell } from "lucide-react";
import { PERIODO_ESCOLAR } from "@/lib/config";

export function PageHeader({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-navy-800">
          Periodo escolar {PERIODO_ESCOLAR}
        </span>
        <button aria-label="Notificaciones" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-200">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
