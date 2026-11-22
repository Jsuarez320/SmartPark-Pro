import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/routes/AppLayout";
import { RoleGuard } from "@/routes/RoleGuard";
import { LoginPage } from "@/modules/auth";
import { OperacionesPage } from "@/modules/operaciones";
import { MensualidadesPage } from "@/modules/mensualidades";
import { CajaPage } from "@/modules/caja";
import { RecibosPage } from "@/modules/recibos";
import { TarifasPage } from "@/modules/tarifas";
import { ConfiguracionPage } from "@/modules/configuracion";
import { DashboardPage } from "@/modules/dashboard";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Entrada y salida en una sola pantalla: todos los usuarios.
      { index: true, element: <OperacionesPage /> },
      { path: "mensualidades", element: <MensualidadesPage /> },
      { path: "caja", element: <CajaPage /> },
      { path: "recibos", element: <RecibosPage /> },
      {
        path: "tarifas",
        element: (
          <RoleGuard roles={["admin"]}>
            <TarifasPage />
          </RoleGuard>
        ),
      },
      {
        path: "configuracion",
        element: (
          <RoleGuard roles={["admin"]}>
            <ConfiguracionPage />
          </RoleGuard>
        ),
      },
      {
        path: "dashboard",
        element: (
          <RoleGuard roles={["admin"]}>
            <DashboardPage />
          </RoleGuard>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
