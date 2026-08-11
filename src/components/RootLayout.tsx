import { Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import LoginPage from "../page/LoginPage";
import NavBar from "./NavBar";

const RootLayout = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Leer login de localStorage al iniciar
  useEffect(() => {
    const logged = localStorage.getItem("loggedIn");
    if (logged === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  // Manejo de login
  const handleLogin = (username: string, password: string) => {
    if (username === "admin" && password === "1234") {
      setIsLoggedIn(true);
      localStorage.setItem("loggedIn", "true");
    } else {
      alert("Usuario o contraseña incorrectos ");
    }
  };

  // Manejo de logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("loggedIn");
  };

  // Si no está logueado → mostrar LoginPage
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Si está logueado → NavBar contiene el Outlet como children
  return (
    <NavBar onLogout={handleLogout}>
      <Outlet />
    </NavBar>
  );
};

export default RootLayout;