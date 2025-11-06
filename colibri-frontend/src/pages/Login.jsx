import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  const devLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const fakeQR =
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SimulacionQR_Huitzilin";
      setQr(fakeQR);
      setShowQR(true);
    } catch (err) {
      setError("Error en modo desarrollador");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://colibri-backend-od5b.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Credenciales inválidas");
        return;
      }

      if (data.require2FA) {
        const qrRes = await fetch(
          `https://colibri-backend-od5b.onrender.com/auth/generate-2fa/${email}`
        );
        const qrData = await qrRes.json();
        setQr(qrData.qr);
        setShowQR(true);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol || "viajero");
      localStorage.setItem("userEmail", email);

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const closeQR = () => {
    setShowQR(false);
    
    const rolSimulado = email.toLowerCase().includes("driver")
      ? "conductor"
      : "viajero";

    localStorage.setItem("token", "fake-jwt-token");
    localStorage.setItem("rol", rolSimulado);
    localStorage.setItem("userEmail", email);

    navigate("/home");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/src/assets/Logo.png" alt="Colibrí logo" className="login-logo" />
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

        <button onClick={devLogin} className="login-dev-button">
          Modo desarrollador
        </button>
      </div>

      {showQR && (
        <div className="qr-overlay">
          <div className="qr-modal">
            <h2>Configura tu verificación 2FA</h2>
            <p>Escanea este código en Google Authenticator o Authy:</p>
            
            {qr && <img src={qr} alt="QR 2FA" className="qr-image" />}
            
            <p style={{fontSize: '0.85rem', color: '#6c757d', marginTop: '1rem'}}>
              Una vez escaneado, podrás generar códigos seguros de acceso.
            </p>
            
            <button onClick={closeQR} className="qr-close">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}