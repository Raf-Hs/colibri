import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Credenciales inválidas");
        return;
      }

      // Guardamos directamente los datos y navegamos
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol || "viajero");
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userSexo", data.sexo || "hombre");
      
      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img 
            src="https://i.imgur.com/tDiPuet.png" 
            alt="Colibrí logo" 
            className="login-logo" 
          />
          <h1 className="login-title">Inicia sesión</h1>
          <h2 className="login-subtitle">Bienvenido a Huitzilin</h2>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Conectando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="login-options">
          <p>¿Aún no tienes cuenta?</p>
          <div className="login-links">
            <Link to="/register" className="login-link">
              Registrarse como Pasajero
            </Link>
            <Link to="/register-conductor" className="login-link">
              Registrarse como Conductor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}