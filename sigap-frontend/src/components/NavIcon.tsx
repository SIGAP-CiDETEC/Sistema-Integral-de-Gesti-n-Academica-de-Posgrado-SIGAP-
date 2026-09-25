import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Bell,
  CalendarCog,
  ClipboardList,
  GraduationCap,
  Scale,
  FileText,
  History,
  FileSignature,
  Home,
  Languages,
  Mail,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  type LucideProps,
} from "lucide-react";
import type { IconName } from "@/lib/nav";

const ICONS: Record<IconName, React.ComponentType<LucideProps>> = {
  home: Home,
  admision: UserPlus,
  expedientes: FileText,
  entrevistas: UserRound,
  evaluacion: BarChart3,
  notificaciones: Bell,
  convocatoria: CalendarCog,
  roles: ShieldCheck,
  usuarios: Users,
  bitacora: History,
  registro: ClipboardList,
  dictamen: Scale,
  matricula: GraduationCap,
  horario: CalendarDays,
  tesis: BookOpenCheck,
  comunicados: Mail,
  idiomas: Languages,
  cartas: FileSignature,
};

export function NavIcon({ name, ...props }: { name: IconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon {...props} />;
}
