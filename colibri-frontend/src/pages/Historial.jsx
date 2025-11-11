import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Historial.css";

export default function Historial() {
  const [viajes, setViajes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem("viajesColibri")) || [];
    setViajes(guardados);
  }, []);

  const renderEstrellas = (calificacion) => {
    return (
      <div className="estrellas-historial">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`estrella ${star <= calificacion ? "activa" : ""}`}
          >
            <svg className="tabler-icon icon-sm">
              <use
                xlinkHref={
                  star <= calificacion ? "#icon-star-filled" : "#icon-star"
                }
              ></use>
            </svg>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="historial-container">
      <div className="historial-box">
        <h1 className="historial-title">
          <svg className="tabler-icon">
            <use xlinkHref="#icon-history"></use>
          </svg>
          Historial de viajes
        </h1>

        {viajes.length === 0 ? (
          <div className="historial-empty">
            <svg className="tabler-icon icon-xl" style={{ opacity: 0.5 }}>
              <use xlinkHref="#icon-file-text"></use>
            </svg>
            <p>Aún no hay viajes guardados.</p>
          </div>
        ) : (
          <ul className="historial-list">
            {viajes.map((viaje) => (
              <li key={viaje.id} className="historial-item">
                <p>
                  <svg className="tabler-icon icon-sm">
                    <use xlinkHref="#icon-route"></use>
                  </svg>
                  <strong>De:</strong> {viaje.origen}
                </p>
                <p>
                  <svg className="tabler-icon icon-sm">
                    <use xlinkHref="#icon-flag"></use>
                  </svg>
                  <strong>A:</strong> {viaje.destino}
                </p>
                <p>
                  <svg className="tabler-icon icon-sm">
                    <use xlinkHref="#icon-user"></use>
                  </svg>
                  <strong>Conductor:</strong> {viaje.conductor}
                </p>
                <p>
                  <svg className="tabler-icon icon-sm">
                    <use xlinkHref="#icon-coin"></use>
                  </svg>
                  <strong>Costo:</strong> ${viaje.costo}
                </p>
                <p>
                  <svg className="tabler-icon icon-sm">
                    <use xlinkHref="#icon-status-change"></use>
                  </svg>
                  <strong>Estado:</strong>{" "}
                  <span className={`estado ${viaje.estado}`}>
                    {viaje.estado}
                  </span>
                </p>

                {/* Calificación */}
                {viaje.calificacion && (
                  <p className="calificacion">
                    <svg className="tabler-icon icon-sm">
                      <use xlinkHref="#icon-star"></use>
                    </svg>
                    <strong>Calificación:</strong>
                    {renderEstrellas(viaje.calificacion)}
                  </p>
                )}

                {/* Reseña */}
                {viaje.reseña && (
                  <p>
                    <svg className="tabler-icon icon-sm">
                      <use xlinkHref="#icon-message"></use>
                    </svg>
                    <strong>Reseña:</strong> {viaje.reseña}
                  </p>
                )}

                {/* Botón para ir a reseñas si el viaje está finalizado */}
                {viaje.estado === "finalizado" && (
                  <button
                    onClick={() => navigate("/reseñas")}
                    className="btn-reseñas"
                  >
                    ⭐ Ver reseñas
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
