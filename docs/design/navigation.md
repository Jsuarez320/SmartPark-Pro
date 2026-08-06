# Navegación

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/login` | LoginPage | público |
| `/` | HomePage → Dashboard (admin) / Registro (employee) | autenticado |
| `/dashboard` | DashboardPage | admin |
| `/vehiculos` | VehiculosPage | admin |
| `/pago` | PagoPage (Cobrar) | admin + employee |
| `/caja` | CajaPage | admin + employee |
| `/configuracion` | ConfiguracionPage | admin |
| `*` | → `/login` (redirect) | — |

## Redirecciones

- Sin sesión (AppLayout) → `/login`.
- Login OK → `/dashboard` (admin) / `/` (employee).
- HomePage: admin → DashboardPage; employee → RegistroPage.
- `RoleGuard roles=["admin"]`: aplica a `/vehiculos`, `/dashboard`, `/configuracion`. Sin rol → `/`.
- `HomeRedirect` es un componente duplicado de HomePage → código muerto.
- Lógica de redirección por rol duplicada en LoginPage + HomePage + RoleGuard (3 lugares).

## Navegación del header

- Ítems filtrados por rol: admin ve 5 rutas, employee 3.
- Ítem activo: `bg-brand-light` + `text-brand`. Inactivo: `text-text-muted`.
- < sm: labels ocultos, quedan solo íconos (sin `aria-label`/tooltip).
- Derecha: toggle de tema + botón Salir. No muestra usuario/rol/turno.

## Relaciones entre pantallas

- Login → (admin) Dashboard | (employee) Registro.
- Registro (home employee) → modal AlertaRegistro (impresión de ticket).
- Cobrar (PagoPage) → PagoModal (pago → recibo → imprimir).
- Caja (employee) → modal Confirmación Cerrar Caja (sin efecto).
- Dashboard y Vehículos: solo lectura de listados/estadísticas.

## Flujos por rol

```
employee: Login → Registro(home) → Cobrar → Caja → Cerrar Caja
admin:    Login → Dashboard(home) → Vehículos / Configuración / Caja
```
