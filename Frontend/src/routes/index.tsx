import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/routes/AppLayout";
import { HomePage } from "@/routes/HomePage";
import { LoginPage } from "@/modules/auth";
import { RegistroPage } from "@/modules/registro";
import { VehiculosPage } from "@/modules/vehiculos";
import { CajaPage } from "@/modules/caja";
import { ConfiguracionPage } from "@/modules/configuracion";
import { PagoPage } from "@/modules/receipt";
import { DashboardPage } from "@/modules/dashboard";
import { RoleGuard } from "@/routes/RoleGuard";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "vehiculos",
        element: (
          <RoleGuard roles={["admin"]}>
            <VehiculosPage />
          </RoleGuard>
        ),
      },
      {
        path: "caja",
        element: <CajaPage />,
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
        path: "pago",
        element: <PagoPage />,
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
