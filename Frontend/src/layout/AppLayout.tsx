import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/layout/Header";
import { useAuthStore } from "@/stores/authStore";

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Header />
      <main key={location.pathname} className="mx-auto w-full max-w-4xl px-6 py-4">
        <Outlet />
      </main>
    </div>
  );
}
