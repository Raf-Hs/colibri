import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
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

/* ===== PROTECCIÓN DE RUTAS ===== */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

/* ===== NAVBAR OPCIONAL ===== */
function Navbar() {
  const location = useLocation();

  // Ocultar en pantallas públicas
  if (["/", "/register", "/register-conductor", "/verify", "/splash"].includes(location.pathname)) {
    return null;
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <nav className="bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🚗</div>
            <span className="text-xl font-bold tracking-tight">Colibrí</span>
          </div>

          <div className="flex gap-2">
            <Link
              to="/home"
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                location.pathname === "/home"
                  ? "bg-white text-green-600 shadow-md transform scale-105"
                  : "hover:bg-white/20 hover:scale-105"
              }`}
            >
              Home
            </Link>

            <Link
              to="/historial"
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                location.pathname === "/historial"
                  ? "bg-white text-green-600 shadow-md transform scale-105"
                  : "hover:bg-white/20 hover:scale-105"
              }`}
            >
              Historial
            </Link>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-all duration-300"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
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
        <Sidebar />
        <Navbar />

        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-conductor" element={<RegisterConductor />} />
          <Route path="/verify" element={<Verify2FA />} />

          {/* Protegidas */}
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

          {/* Default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LoadScript>
  );
}
