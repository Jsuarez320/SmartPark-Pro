import { NavLink, useNavigate } from "react-router-dom";
import { CalendarClock, ClipboardList, LayoutDashboard, LogOut, Moon, Receipt, Settings, Sun, Tags, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useResumenMensualidades } from "@/modules/mensualidades";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Operaciones", icon: ClipboardList, roles: ["admin", "employee"] },
  { to: "/mensualidades", label: "Mensualidades", icon: CalendarClock, roles: ["admin", "employee"] },
  { to: "/caja", label: "Caja", icon: Wallet, roles: ["admin", "employee"] },
  { to: "/recibos", label: "Recibos", icon: Receipt, roles: ["admin", "employee"] },
  { to: "/tarifas", label: "Tarifas", icon: Tags, roles: ["admin"] },
  { to: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const navigate = useNavigate();
  // Alerta de vencimientos: puntito en «Mensualidades» si hay por vencer o vencidas.
  const { data: resumen } = useResumenMensualidades();
  const alertasMensualidades = (resumen?.porVencer ?? 0) + (resumen?.vencidas ?? 0);

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
              <span className="relative">
                <item.icon className="size-4 shrink-0" />
                {item.to === "/mensualidades" && alertasMensualidades > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white"
                    aria-label={`${alertasMensualidades} mensualidades por vencer o vencidas`}
                  >
                    {alertasMensualidades > 9 ? "9+" : alertasMensualidades}
                  </span>
                )}
              </span>
              <span className="hidden lg:inline">{item.label}</span>
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
