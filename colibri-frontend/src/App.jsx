import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Historial from "./pages/Historial";
import SplashScreen from "./pages/SplashScreen";
import "./pages/SplashScreen.css";

// Componente Navbar separado para usar useLocation
function Navbar() {
  const location = useLocation();
  
  // No mostrar navbar en login, register y splash
  if (location.pathname === "/" || location.pathname === "/register" || location.pathname === "/splash") {
    return null;
  }
  
  return (
    <nav className="bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Título */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">🚗</div>
            <span className="text-xl font-bold tracking-tight">Colibrí</span>
          </div>
          
          {/* Links de navegación */}
          <div className="flex gap-2">
            <Link
              to="/home"
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                location.pathname === "/home"
                  ? "bg-white text-green-600 shadow-md transform scale-105"
                  : "hover:bg-white/20 hover:scale-105"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🏠</span>
                <span>Home</span>
              </span>
            </Link>
            
            <Link
              to="/historial"
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                location.pathname === "/historial"
                  ? "bg-white text-green-600 shadow-md transform scale-105"
                  : "hover:bg-white/20 hover:scale-105"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>Historial</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Ocultar splash después de 3 segundos
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Mostrar splash screen al inicio
  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/historial" element={<Historial />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;