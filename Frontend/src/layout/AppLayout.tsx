import { Outlet } from "react-router-dom";
import { Header } from "@/layout/Header";

/**
 * Layout principal de la aplicación.
 * Encamina y renderiza el contenido de las vistas (pages) dentro del Outlet,
 * asegurando una estructura uniforme de navegación con el Header visible.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
