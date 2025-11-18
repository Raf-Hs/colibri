import { useEffect, useState } from "react";
import "./ValidadorPanel.css";

export default function ValidadorPanel() {
  const [lista, setLista] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);

  /* ============================
     Cargar lista de pendientes
  ============================ */
  const cargarLista = async () => {
    try {
      const res = await fetch("http://localhost:4000/validacion/pendientes", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      const data = await res.json();
      setLista(data);
    } catch (err) {
      console.error("Error cargando lista:", err);
    }
  };

  /* ============================
     Cargar detalle del conductor
  ============================ */
  const cargarDetalle = async (id) => {
    try {
      setSeleccionado(id);

      const res = await fetch(
        `http://localhost:4000/validacion/conductor/${id}/documentos`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      const data = await res.json();
      setDetalle(data);
    } catch (err) {
      console.error("Error cargando detalle:", err);
    }
  };

  /* ============================
     Aprobar conductor
  ============================ */
  const aprobar = async () => {
    try {
      await fetch(
        `http://localhost:4000/validacion/aprobar/${seleccionado}`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      setDetalle(null);
      cargarLista();
    } catch (err) {
      console.error("Error aprobando:", err);
    }
  };

  /* ============================
     Rechazar conductor
  ============================ */
  const rechazar = async () => {
    try {
      await fetch(
        `http://localhost:4000/validacion/rechazar/${seleccionado}`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      setDetalle(null);
      cargarLista();
    } catch (err) {
      console.error("Error rechazando:", err);
    }
  };

  /* ============================
     useEffect CORRECTO
  ============================ */
  useEffect(() => {
    cargarLista();
  }, []);

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="validador-container">
      <div className="validador-box">
        
        {/* === COLUMNA IZQUIERDA === */}
        <div className="validador-lista">
          <h2>Conductores pendientes</h2>

          {lista.length === 0 && (
            <p className="validador-vacio">No hay conductores en revisión.</p>
          )}

          {lista.map((c) => (
            <div
              key={c.id}
              className={`validador-item ${
                seleccionado === c.id ? "selected" : ""
              }`}
              onClick={() => cargarDetalle(c.id)}
            >
              <strong>{c.nombre}</strong>
              <span>{c.email}</span>
              <span>{c.telefono}</span>
            </div>
          ))}
        </div>

        {/* === PANEL DERECHO === */}
        <div className="validador-detalle">
          {!detalle && (
            <p className="validador-vacio">Selecciona un conductor para revisar.</p>
          )}

          {detalle && (
            <>
              <h2>{detalle.nombre}</h2>
              <p><b>Email:</b> {detalle.email}</p>

              <h3>Documentos</h3>

              {Object.entries(detalle.documentos).map(([key, value]) => (
                <div key={key} className="doc-bloque">
                  <h4>{key}</h4>

                  {Array.isArray(value) ? (
                    value.map((url, i) => <img key={i} src={url} />)
                  ) : (
                    <img src={value} />
                  )}
                </div>
              ))}

              <button className="btn-accion btn-aprobar" onClick={aprobar}>
                Aprobar
              </button>

              <button className="btn-accion btn-rechazar" onClick={rechazar}>
                Rechazar
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
