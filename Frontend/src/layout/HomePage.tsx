import { useAuthStore, isAdminRole } from "@/stores/authStore";
import { RegistroPage } from "@/modules/registro";
import { DashboardPage } from "@/modules/dashboard";

export function HomePage() {
  const user = useAuthStore((s) => s.user);

  if (isAdminRole(user?.role)) return <DashboardPage />;
  return <RegistroPage />;
}
