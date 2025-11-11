import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoadScript } from "@react-google-maps/api";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import RegisterConductor from "./pages/RegisterConductor";
import Verify2FA from "./pages/Verify2FA";
import Historial from "./pages/Historial";
import SplashScreen from "./pages/SplashScreen";
import Sidebar from "./components/Sidebar";
import "./pages/SplashScreen.css";
import Reseñas from "./pages/Reseñas";

/* ===== PROTECCIÓN DE RUTAS ===== */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

/* ===== APP PRINCIPAL ===== */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <BrowserRouter>
        {/* Sidebar visible solo en rutas privadas */}
        <Sidebar />

        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-conductor" element={<RegisterConductor />} />
          <Route path="/verify" element={<Verify2FA />} />

          {/* Rutas protegidas */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <ProtectedRoute>
                <Historial />
              </ProtectedRoute>
            }
          />

          <Route 
            path="/reseñas" 
            element={
            <ProtectedRoute>
                <Reseñas />
              </ProtectedRoute>
            }
          />
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LoadScript>
  );
}
