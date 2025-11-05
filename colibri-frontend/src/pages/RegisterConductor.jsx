import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

export default function RegisterConductor() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
  });
  const [docs, setDocs] = useState({
    identificacion: null,
    licencia: null,
    poliza: null,
    domicilio: null,
    vehiculoFotos: [],
    fotoConductor: null,
    acreditacionTaxi: null,
  });
  const [preview, setPreview] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e, field, multiple = false) => {
    const files = multiple ? Array.from(e.target.files) : e.target.files[0];
    setDocs({ ...docs, [field]: files });

    if (multiple) {
      const urls = files.map((f) => URL.createObjectURL(f));
      setPreview({ ...preview, [field]: urls });
    } else if (files) {
      const reader = new FileReader();
      reader.onload = () => setPreview({ ...preview, [field]: reader.result });
      reader.readAsDataURL(files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Paso 1: registro básico del conductor
      const res = await fetch("https://colibri-backend-od5b.onrender.com/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rol: "conductor" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar el conductor");
        setLoading(false);
        return;
      }

      // Paso 2: (futuro) subida de documentos
      // const formData = new FormData();
      // Object.entries(docs).forEach(([key, value]) => {
      //   if (Array.isArray(value)) value.forEach((f) => formData.append(key, f));
      //   else if (value) formData.append(key, value);
      // });
      // await fetch("https://colibri-backend-od5b.onrender.com/auth/upload-docs", {
      //   method: "POST",
      //   body: formData,
      // });

      alert("✅ Registro exitoso. En breve revisaremos tu documentación.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <img src="/icons/icon-192x192.png" alt="logo" className="register-logo" />
          <h1 className="register-title">Registro de Conductor</h1>
          <h2 className="register-subtitle">
            Conduce con Huitzilin y genera ingresos
          </h2>
        </div>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form" autoComplete="off">
          {/* Datos personales */}
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

          {/* Documentación obligatoria */}
          <h3 style={{ textAlign: "left", color: "#28A745", marginTop: "1.2rem" }}>
            Documentación obligatoria
          </h3>

          <label className="form-label">Identificación oficial (INE, pasaporte o licencia)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "identificacion")} required />

          <label className="form-label">Licencia de conducir vigente</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "licencia")} required />

          <label className="form-label">Póliza de seguro del vehículo</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "poliza")} required />

          <label className="form-label">Comprobante de domicilio (≤ 3 meses)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "domicilio")} required />

          <label className="form-label">Fotografías del vehículo (frontal, trasera, lateral e interior)</label>
          <input type="file" multiple accept="image/*" onChange={(e) => handleFile(e, "vehiculoFotos", true)} required />

          <div className="preview-grid">
            {preview.vehiculoFotos &&
              preview.vehiculoFotos.map((src, i) => (
                <img key={i} src={src} className="preview-img" alt={`vehiculo-${i}`} />
              ))}
          </div>

          <label className="form-label">Fotografía del conductor</label>
          <input type="file" accept="image/*" onChange={(e) => handleFile(e, "fotoConductor")} required />

          <label className="form-label">Acreditación municipal o estatal (si aplica)</label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "acreditacionTaxi")} />

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registrando..." : "REGISTRARSE COMO CONDUCTOR"}
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
