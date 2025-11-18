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

  const [identificacion, setIdentificacion] = useState(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setIdentificacion(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("nombre", form.nombre);
      formData.append("email", form.email);
      formData.append("telefono", form.telefono);
      formData.append("password", form.password);
      formData.append("rol", "viajero");

      if (identificacion) {
        formData.append("identificacion", identificacion);
      }

      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar usuario");
        setLoading(false);
        return;
      }

      alert("Registro exitoso. Ya puedes iniciar sesión.");
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

          <label className="register-label">
            Identificación oficial vigente (INE o pasaporte)
          </label>

          <div className="register-id-warning">
            * Debe ser una identificación vigente en formato de imagen
            (fotografía clara y legible).
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="register-input"
          />

          {/* === Checkbox de Términos === */}
          <div className="terminos-box">
            <label className="terminos-label">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
              />
              Acepto los Términos y Condiciones y la Política de Privacidad de Huitzilin.
            </label>
          </div>

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
