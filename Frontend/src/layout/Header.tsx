import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, Car, Wallet, Settings, LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { to: "/", label: "Registro", icon: ClipboardList },
  { to: "/vehiculos", label: "Vehículos", icon: Car },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export function Header() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
        <h1 className="text-base font-bold text-text-primary tracking-tight">
          Parqueadero
        </h1>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-brand border-b-2 border-brand"
                    : "text-text-muted hover:text-text-secondary"
                }`
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Button variant="outline" onClick={handleLogout} className="text-text-muted border-border gap-2 text-sm">
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
