import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
