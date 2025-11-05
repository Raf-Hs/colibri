import { useState } from "react";
import "./Verify2FA.css";

export default function Enable2FA() {
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState(null);
  const [email, setEmail] = useState("");

  const handleGenerate = async () => {
    const res = await fetch(
      `https://colibri-backend-od5b.onrender.com/auth/generate-2fa/${email}`
    );
    const data = await res.json();
    setQr(data.qr);
    setSecret(data.secret);
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        <h1 className="verify-title">Activar verificación 2FA</h1>
        <input
          type="email"
          placeholder="Tu correo registrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="verify-input"
        />
        <button onClick={handleGenerate} className="verify-button">
          Generar código QR
        </button>

        {qr && (
          <div className="verify-qr">
            <p>Escanea este código con tu app Authenticator:</p>
            <img src={qr} alt="QR Code" style={{ width: "200px", margin: "1rem auto" }} />
            <p><strong>Clave secreta:</strong> {secret}</p>
          </div>
        )}
      </div>
    </div>
  );
}
