import { Car } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-slate-950 text-white">
            <Car className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold leading-tight">SmartPark Pro</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Control e ingenieria de parqueo
            </p>
            <p>Hola mundo</p>
            <p>Prueba</p>
            <p>Prueba 2</p>
            <p>Hola</p>
          </div>
        </div>
      </div>
    </header>
  );
}
