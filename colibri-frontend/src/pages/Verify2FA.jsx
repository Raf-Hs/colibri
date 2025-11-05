import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Verify2FA.css";

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Simulación de verificación (a futuro se conectará al backend)
      if (code === "123456") {
        // Código correcto → activar sesión
        const tempToken = sessionStorage.getItem("tempToken");
        if (tempToken) localStorage.setItem("token", tempToken);
        sessionStorage.removeItem("tempToken");
        alert("✅ Verificación completada con éxito");
        navigate("/home");
      } else {
        setError("Código incorrecto. Intenta nuevamente.");
      }
    } catch (err) {
      setError("Error al verificar el código.", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        <h1 className="verify-title">Verificación de seguridad</h1>
        <p className="verify-subtitle">
          Introduce el código de 6 dígitos enviado a tu correo o app Authenticator.
        </p>

        {error && <div className="verify-error">{error}</div>}

        <form onSubmit={handleVerify} className="verify-form">
          <input
            type="text"
            maxLength="6"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ingresa tu código"
            required
            className="verify-input"
          />
          <button
            type="submit"
            className="verify-button"
            disabled={loading}
          >
            {loading ? "Verificando..." : "Verificar código"}
          </button>
        </form>

        <p className="verify-footer">
          ¿No recibiste el código?{" "}
          <button className="verify-link" onClick={() => alert("📩 Código reenviado (simulado)")}>
            Reenviar código
          </button>
        </p>
      </div>
    </div>
  );
}
