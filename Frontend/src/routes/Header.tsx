import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, Car, Wallet, Settings, LogOut, Receipt, LayoutDashboard, Moon, Sun } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Registro", icon: ClipboardList, roles: ["admin", "employee"] },
  { to: "/vehiculos", label: "Vehículos", icon: Car, roles: ["admin"] },
  { to: "/pago", label: "Cobrar", icon: Receipt, roles: ["admin", "employee"] },
  { to: "/caja", label: "Caja", icon: Wallet, roles: ["admin", "employee"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold mr-1">
            SP
          </div>
          <span className="hidden sm:inline text-sm font-semibold text-text-primary">
            SmartPark Pro
          </span>
        </div>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-light text-brand shadow-sm"
                    : "text-text-muted hover:text-text-secondary hover:bg-background"
                }`
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-background transition-colors"
            aria-label="Cambiar tema"
          >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-text-muted border-border gap-1.5 text-sm h-8 px-2.5"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
