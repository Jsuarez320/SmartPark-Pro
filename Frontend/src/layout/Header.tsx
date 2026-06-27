import { Car, CalendarDays, PlusCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-surface shadow-sm border-teal-600/20">
      <div className="mx-auto flex h-20 w-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-dark text-brand-bright shadow-md">
            <Car className="size-6" aria-hidden="true" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold leading-tight text-text-primary tracking-tight">
              SmartPark <span className="text-brand-bright">Pro</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-bright">
              Control e ingeniería de parqueo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-muted font-medium">
            <CalendarDays className="size-4 opacity-70" />
            <span>UTC mié, 24 de jun, 04:34 p. m.</span>
          </div>

          <Button className="bg-brand hover:bg-brand-hover text-white rounded-full px-5 py-2 flex items-center gap-2 h-10 font-semibold shadow-md">
            <PlusCircle className="size-5" />
            Registrar Ingreso
          </Button>
        </div>
      </div>
    </header>
  );
}
