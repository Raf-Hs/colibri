import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("https://colibri-backend-od5b.onrender.com/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rol: "viajero" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar usuario");
        setLoading(false);
        return;
      }

      alert("✅ Registro exitoso. Ya puedes iniciar sesión.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar al servidor. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <img
            src="/src/assets/Logo.png"
            alt="Colibrí logo"
            className="register-logo"
          />
          <h1 className="register-title">Registro de Pasajero</h1>
          <h2 className="register-subtitle">Viaja seguro con Huitzilin</h2>
        </div>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form" autoComplete="off">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={handleChange}
            required
            className="register-input"
          />

          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={handleChange}
            required
            className="register-input"
          />

          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={handleChange}
            required
            className="register-input"
          />

          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            required
            className="register-input"
          />

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registrando..." : "Registrarse como Pasajero"}
          </button>
        </form>

        <p className="register-footer">
          ¿Ya tienes cuenta?{" "}
          <button onClick={() => navigate("/")} className="register-link">
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}