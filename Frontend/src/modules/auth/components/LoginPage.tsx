import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useLoginPage } from "../hooks/useLoginPage";

export function LoginPage() {
  const {
    username,
    password,
    showPassword,
    setShowPassword,
    loading,
    error,
    handleSubmit,
    handleUsernameChange,
    handlePasswordChange,
  } = useLoginPage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/20">
            <Car className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            SmartPark <span className="text-brand">Pro</span>
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Inicie sesión para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Usuario
              </label>
              <Input
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Ingrese su usuario"
                className="h-11"
                disabled={loading}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="h-11 pr-10"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-muted"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3" role="alert">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
