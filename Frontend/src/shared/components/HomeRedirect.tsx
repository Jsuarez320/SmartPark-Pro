import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === "admin") return <Navigate to="/dashboard" replace />;
  return <RegistroPage />;
}

function RegistroPage() {
  return <Navigate to="/" replace />;
}
