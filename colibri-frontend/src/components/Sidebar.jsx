import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // === Ocultar sidebar en pantallas públicas ===
  if (
    ["/", "/register", "/register-conductor", "/verify", "/splash"].includes(
      location.pathname
    )
  ) {
    return null;
  }

  // === FUNCIÓN DE CIERRE DE SESIÓN ===
  const cerrarSesion = () => {
    try {
      localStorage.clear(); // Borra todo
      navigate("/");
      setOpen(false);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  return (
    <>
      {/* === BOTÓN HAMBURGUESA (SOLO VISIBLE SI ESTÁ CERRADO) === */}
      {!open && (
        <button className="menu-btn" onClick={() => setOpen(true)}>
          ☰
        </button>
      )}

      {/* === SIDEBAR === */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        
        {/* 1. CABECERA (Perfil) */}
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setOpen(false)}>
            ✕
          </button>
          <img 
            src="https://i.imgur.com/tDiPuet.png" 
            alt="Huitzilin Logo" 
            className="sidebar-logo-img"
          />
          <h2 className="sidebar-logo">Huitzilin</h2>
          <p className="sidebar-role">Conductor</p>
        </div>

        {/* 2. NAVEGACIÓN (Solo los links) */}
        {/* flex: 1 hace que esta sección empuje el footer hacia abajo */}
        <nav className="sidebar-nav">
          <Link
            to="/home"
            className={`nav-item ${location.pathname === "/home" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">🏠</span>
            Inicio
          </Link>

          <Link
            to="/historial"
            className={`nav-item ${location.pathname === "/historial" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">📋</span>
            Historial
          </Link>
        </nav>

        {/* 3. FOOTER (Aquí va el botón de salir para que quede abajo) */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={cerrarSesion}>
            <span className="nav-icon">🚪</span>
            Cerrar sesión
          </button>
        </div>

      </aside>

      {/* === OVERLAY (FONDO OSCURO) === */}
      <div 
        className={`overlay ${open ? "visible" : ""}`} 
        onClick={() => setOpen(false)} 
      />
    </>
  );
}