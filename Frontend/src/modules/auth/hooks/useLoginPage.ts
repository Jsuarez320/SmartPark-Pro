import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, isAdminRole } from "@/stores/authStore";

export function useLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const userRole = useAuthStore((s) => s.user?.role);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(isAdminRole(userRole) ? "/dashboard" : "/", { replace: true });
  }, [isAuthenticated, navigate, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username || !password) {
      useAuthStore.setState({ error: "Ingrese usuario y contraseña" });
      return;
    }

    await login(username, password);
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (error) clearError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) clearError();
  };

  return {
    username,
    password,
    showPassword,
    setShowPassword,
    loading,
    error,
    handleSubmit,
    handleUsernameChange,
    handlePasswordChange,
  };
}
