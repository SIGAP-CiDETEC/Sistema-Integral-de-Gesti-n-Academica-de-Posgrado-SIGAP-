import { AppShell } from "@/components/AppShell";

export default function Layout({ children }: LayoutProps<"/alumno">) {
  return <AppShell rol="alumno">{children}</AppShell>;
}
