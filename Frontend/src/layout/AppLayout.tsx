import { Outlet } from "react-router-dom";
import { Header } from "@/layout/Header";

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
