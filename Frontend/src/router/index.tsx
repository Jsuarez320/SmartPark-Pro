import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/modules/auth";
import { RegistroPage } from "@/modules/registro";
import { VehiculosPage } from "@/modules/vehiculos";
import { CajaPage } from "@/modules/caja";
import { ConfiguracionPage } from "@/modules/configuracion";

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
        element: <RegistroPage />
      },
      {
        path: "vehiculos",
        element: <VehiculosPage />
      },
      {
        path: "caja",
        element: <CajaPage />
      },
      {
        path: "configuracion",
        element: <ConfiguracionPage />
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
