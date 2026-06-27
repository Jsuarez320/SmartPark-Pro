import { Outlet } from "react-router-dom";
import { Header } from "@/layout/Header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-6 py-4">
        <Outlet />
      </main>
    </div>
  );
}
