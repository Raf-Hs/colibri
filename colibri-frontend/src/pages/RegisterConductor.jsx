import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterConductor.css";

export default function RegisterConductor() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    sexo: "", // ← agregado
  });

  const [aceptaTerminos, setAceptaTerminos] = useState(false);

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

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("nombre", form.nombre);
      formData.append("email", form.email);
      formData.append("telefono", form.telefono);
      formData.append("password", form.password);
      formData.append("sexo", form.sexo); // ← agregado
      formData.append("rol", "conductor");

      formData.append("identificacion", docs.identificacion);
      formData.append("licencia", docs.licencia);
      formData.append("poliza", docs.poliza);
      formData.append("domicilio", docs.domicilio);
      formData.append("fotoConductor", docs.fotoConductor);

      if (docs.acreditacionTaxi) {
        formData.append("acreditacionTaxi", docs.acreditacionTaxi);
      }

      docs.vehiculoFotos.forEach((file) => {
        formData.append("vehiculoFotos", file);
      });

      const res = await fetch("http://localhost:4000/auth/register-conductor", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar el conductor");
        setLoading(false);
        return;
      }

      alert("Registro exitoso. En breve revisaremos tu documentación.");
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
          <img src="/src/assets/Logo.png" alt="logo" className="register-logo" />
          <h1 className="register-title">Registro de Conductor</h1>
          <h2 className="register-subtitle">
            Conduce con Huitzilin y genera ingresos
          </h2>
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

          {/* === CAMPO SEXO === */}
          <select
            name="sexo"
            value={form.sexo}
            onChange={handleChange}
            required
            className="register-input"
          >
            <option value="">Selecciona tu sexo</option>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
            <option value="otro">Otro</option>
          </select>
          {/* =================== */}

          <div className="documentacion-section">
            <h3 className="documentacion-title">Documentación obligatoria</h3>

            <label className="form-label required">Identificación oficial</label>
            <input type="file" accept="image/*,application/pdf" required onChange={(e) => handleFile(e, "identificacion")} />

            <label className="form-label required">Licencia de conducir vigente</label>
            <input type="file" accept="image/*,application/pdf" required onChange={(e) => handleFile(e, "licencia")} />

            <label className="form-label required">Póliza de seguro del vehículo</label>
            <input type="file" accept="image/*,application/pdf" required onChange={(e) => handleFile(e, "poliza")} />

            <label className="form-label required">Comprobante de domicilio</label>
            <input type="file" accept="image/*,application/pdf" required onChange={(e) => handleFile(e, "domicilio")} />

            <label className="form-label required">Fotografías del vehículo</label>
            <input type="file" multiple accept="image/*" required onChange={(e) => handleFile(e, "vehiculoFotos", true)} />

            <div className="preview-grid">
              {preview.vehiculoFotos &&
                preview.vehiculoFotos.map((src, i) => (
                  <img key={i} src={src} className="preview-img" />
                ))}
            </div>

            <label className="form-label required">Fotografía del conductor</label>
            <input type="file" accept="image/*" required onChange={(e) => handleFile(e, "fotoConductor")} />

            <label className="form-label">Acreditación (opcional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e, "acreditacionTaxi")} />
          </div>

          <div className="terminos-box">
            <label className="terminos-label">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
              />
              Acepto los Términos y Condiciones y el uso de mis datos conforme a la Política de Privacidad.
            </label>
          </div>

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
