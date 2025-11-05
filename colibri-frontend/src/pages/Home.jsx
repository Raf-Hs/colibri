import { useState, useEffect } from "react";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

export default function Home() {
  const [viaje, setViaje] = useState({
    origen: null,
    destino: null,
    distancia: "",
    duracion: "",
    directions: null,
    estado: "pendiente",
  });

  const [ofertas, setOfertas] = useState([]);

  const handleSelect = (data) => {
    setViaje((prev) => ({ ...prev, ...data }));
  };

  const calcularCosto = () => {
    if (!viaje.distancia) return 0;
    const km = parseFloat(viaje.distancia.replace(" km", "").replace(",", "."));
    const base = 25;
    const porKm = 8.5;
    return (base + km * porKm).toFixed(2);
  };

  const costo = calcularCosto();

  const solicitarViaje = () => {
    if (!viaje.directions) return;
    setViaje((prev) => ({ ...prev, estado: "buscando" }));
    setOfertas([]);

    // Simular llegada de ofertas
    setTimeout(() => {
      setOfertas([
        {
          id: 1,
          nombre: "Carlos M.",
          rating: 4.8,
          tiempo: "3 min",
          precio: costo,
          restante: 10,
        },
        {
          id: 2,
          nombre: "Laura R.",
          rating: 4.6,
          tiempo: "5 min",
          precio: (costo * 1.1).toFixed(2),
          restante: 10,
        },
      ]);
    }, 1500);
  };

  // Temporizador individual por oferta
  useEffect(() => {
    if (viaje.estado !== "buscando" || ofertas.length === 0) return;

    const interval = setInterval(() => {
      setOfertas((prev) =>
        prev
          .map((o) => ({
            ...o,
            restante: o.restante > 0 ? o.restante - 1 : 0,
          }))
          .filter((o) => o.restante > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [viaje.estado, ofertas.length]);

  const aceptarOferta = (oferta) => {
    setViaje((prev) => ({ ...prev, estado: "en-curso", conductor: oferta }));
    setOfertas([]);
  };

  const finalizarViaje = () => {
    setViaje((prev) => ({ ...prev, estado: "finalizado" }));
  };

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Huitzilin</h1>

        <section className="map-section">
          <MapaRutas onSelect={handleSelect} />
        </section>

        {viaje.directions && (
          <>
            <div className="trip-miniinfo">
              <p>
                <strong>Distancia:</strong> {viaje.distancia}
              </p>
              <p>
                <strong>Duración:</strong> {viaje.duracion}
              </p>
            </div>

            {/* Tarjeta principal */}
            <div className="trip-card">
              <div className="trip-cost">
                <p className="trip-price">${costo}</p>
                <span className="trip-label">Tarifa estimada</span>
              </div>

              {viaje.estado === "pendiente" && (
                <button className="home-button" onClick={solicitarViaje}>
                  Solicitar viaje
                </button>
              )}

              {/* BUSCANDO */}
              {viaje.estado === "buscando" && (
                <div className="trip-card buscando">
                  <p className="buscando-titulo">
                    🔍 Buscando conductores disponibles...
                  </p>

                  {ofertas.length === 0 ? (
                    <p className="buscando-texto">Esperando resultados...</p>
                  ) : (
                    <div className="ofertas-lista compacta">
                      {ofertas.map((o) => (
                        <div key={o.id} className="oferta-card compacta">
                          <div className="oferta-info">
                            <h3>{o.nombre}</h3>
                            <p>
                              ⭐ {o.rating} · {o.tiempo}
                            </p>
                            <p className="oferta-timer">
                              ⏳ {o.restante}s restantes
                            </p>
                          </div>
                          <div className="oferta-precio">
                            <span>${o.precio}</span>
                            <button
                              className="btn-estado verde"
                              onClick={() => aceptarOferta(o)}
                            >
                              Aceptar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* EN CURSO */}
              {viaje.estado === "en-curso" && (
                <div className="viaje-actual">
                  <p>
                    <strong>Conductor:</strong> {viaje.conductor?.nombre} ⭐{" "}
                    {viaje.conductor?.rating}
                  </p>
                  <p>🚗 En camino ({viaje.conductor?.tiempo})</p>
                  <button
                    className="btn-estado verde"
                    onClick={finalizarViaje}
                    style={{ marginTop: "0.8rem" }}
                  >
                    Finalizar viaje
                  </button>
                </div>
              )}

              {/* FINALIZADO */}
              {viaje.estado === "finalizado" && (
                <div className="viaje-actual finalizado">
                  <p>✅ Viaje finalizado con éxito.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
