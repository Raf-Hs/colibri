import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Ocultar sidebar en login, registro y splash
  if (
    location.pathname === "/" ||
    location.pathname === "/register" ||
    location.pathname === "/splash"
  ) {
    return null;
  }

  // === FUNCIÓN DE CIERRE DE SESIÓN ===
  const cerrarSesion = () => {
    try {
      // Borra viajes, usuario u otros datos temporales
      localStorage.removeItem("viajesColibri");
      localStorage.removeItem("usuario");
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
      {/* Botón hamburguesa visible solo cuando el sidebar está cerrado */}
      {!open && (
        <button className="menu-btn" onClick={() => setOpen(true)}>
          ☰
        </button>
      )}

      {/* Sidebar lateral */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">
            🕊️ <span>Huitzilin</span>
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
            🏠 Inicio
          </Link>

          <Link
            to="/historial"
            className={location.pathname === "/historial" ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            📋 Historial
          </Link>

          {/* Botón cerrar sesión */}
          <button className="logout-btn" onClick={cerrarSesion}>
            🚪 Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* Fondo opaco detrás del menú */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
