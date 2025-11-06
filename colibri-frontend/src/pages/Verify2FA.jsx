import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Verify2FA.css";

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (code === "123456") {
        const tempToken = sessionStorage.getItem("tempToken");
        if (tempToken) localStorage.setItem("token", tempToken);
        sessionStorage.removeItem("tempToken");
        navigate("/home");
      } else {
        setError("Código incorrecto. Intenta nuevamente.");
      }
    } catch (err) {
      setError("Error al verificar el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const qrRes = await fetch(
        `https://colibri-backend-od5b.onrender.com/auth/generate-2fa/test@example.com`
      );
      const qrData = await qrRes.json();
      setQr(qrData.qr);
      setShowQR(true);
    } catch (err) {
      setError("Error al generar código QR");
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
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
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

        <div className="verify-footer">
          ¿No recibiste el código?
          <button className="verify-link" onClick={handleGenerateQR}>
            Generar código QR
          </button>
        </div>

        {showQR && qr && (
          <div style={{marginTop: '2rem'}}>
            <p>Escanea este código QR:</p>
            <img src={qr} alt="QR Code" className="qr-image" />
            <button 
              className="verify-button" 
              onClick={() => setShowQR(false)}
              style={{marginTop: '1rem', padding: '0.6rem 1.5rem', fontSize: '0.9rem'}}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}