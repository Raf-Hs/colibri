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
      // Elimina token, rol, viajes y datos del usuario
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("viajesColibri");
      localStorage.clear();

      // Redirige al login
      navigate("/");

      // Cierra el menú
      setOpen(false);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  return (
    <>
      {/* === BOTÓN HAMBURGUESA === */}
      {!open && (
        <button className="menu-btn" onClick={() => setOpen(true)}>
          ☰
        </button>
      )}

      {/* === SIDEBAR === */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <img 
            src="/src/assets/Logo.png" 
            alt="Huitzilin Logo" 
            className="sidebar-logo-img"
          />
          <h2 className="sidebar-logo">
            <span>Huitzilin</span>
          </h2>
          <button className="close-btn" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/home"
            className={location.pathname === "/home" ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">🏠</span>
            Inicio
          </Link>

          <Link
            to="/historial"
            className={location.pathname === "/historial" ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">📋</span>
            Historial
          </Link>

          <button className="logout-btn" onClick={cerrarSesion}>
            <span className="nav-icon">🚪</span>
            Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* === OVERLAY OSCURO === */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </>
  );
}