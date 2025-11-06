import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");

export default function Home() {
  const rol = localStorage.getItem("rol") || "viajero";
  const [ubicacionActual, setUbicacionActual] = useState("");

  useEffect(() => {
    console.log(`🟢 Usuario autenticado como: ${rol.toUpperCase()}`);
    
    // Obtener ubicación actual
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUbicacionActual(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      });
    }
  }, [rol]);

  const [activo, setActivo] = useState(false);
  const [viaje, setViaje] = useState({
    origen: null,
    destino: null,
    distancia: "",
    duracion: "",
    directions: null,
    estado: "pendiente",
    conductor: null,
  });

  const [ofertas, setOfertas] = useState([]);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const intervaloViaje = useRef(null);

  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSelect = (data) => setViaje((prev) => ({ ...prev, ...data }));

  const calcularCosto = () => {
    if (!viaje.distancia) return 0;
    const km = parseFloat(viaje.distancia.replace(" km", "").replace(",", "."));
    const base = 25;
    const porKm = 8.5;
    return (base + km * porKm).toFixed(2);
  };
  const costo = calcularCosto();

  useEffect(() => {
    if (!socket) return;

    if (rol === "conductor" && activo) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const datosConductor = {
          id: localStorage.getItem("userEmail"),
          nombre: localStorage.getItem("userEmail"),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        socket.emit("conductor_activo", datosConductor);
      });
    }

    socket.on("nuevo_viaje", (viaje) => {
      alert("📢 Nuevo viaje disponible cerca de ti");
    });

    socket.on("ofertas", (conductores) => {
      setOfertas(
        conductores.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          rating: 4.8,
          tiempo: "3 min",
          auto: "Vehículo disponible",
          precio: calcularCosto(),
          restante: 10,
        }))
      );
    });

    return () => {
      socket.off("nuevo_viaje");
      socket.off("ofertas");
    };
  }, [rol, activo]);

  if (rol === "conductor") {
    return (
      <div className="home-container">
        <div className="home-box">
          <h1 className="home-title">Panel de Conductor</h1>

          <section className="map-section">
            <MapaRutas marcadorConductor={posicionConductor} />
          </section>

          <div className="trip-card">
            {!activo ? (
              <button className="home-button" onClick={() => setActivo(true)}>
                Recibir Viajes
              </button>
            ) : (
              <div className="viaje-actual">
                <p>
                  Estado: <strong>Activo</strong>
                </p>
                <p>Esperando solicitudes de viaje...</p>
                <button
                  className="btn-estado verde"
                  style={{ background: "#F48C64" }}
                  onClick={() => setActivo(false)}
                >
                  Detener
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const solicitarViaje = () => {
    if (!viaje.directions || !viaje.origen) return;
    setViaje((v) => ({ ...v, estado: "buscando" }));
    setOfertas([]);

    socket.emit("buscar_conductor", {
      origen: viaje.origen,
      destino: viaje.destino,
      distancia: viaje.distancia,
    });
  };

  useEffect(() => {
    if (viaje.estado !== "buscando" || ofertas.length === 0) return;
    const interval = setInterval(() => {
      setOfertas((prev) =>
        prev
          .map((o) => ({ ...o, restante: o.restante > 0 ? o.restante - 1 : 0 }))
          .filter((o) => o.restante > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [viaje.estado, ofertas.length]);

  const aceptarOferta = (oferta) => {
    setViaje((v) => ({
      ...v,
      estado: "asignado",
      conductor: oferta,
    }));
    setOfertas([]);
  };

  const iniciarViaje = () => {
    const ruta = viaje.directions.routes[0].overview_path;
    let i = 0;
    setPosicionConductor(ruta[0]);
    setViaje((v) => ({ ...v, estado: "en-curso", progreso: 0 }));

    intervaloViaje.current = setInterval(() => {
      if (i < ruta.length - 1) {
        i++;
        const progreso = ((i / ruta.length) * 100).toFixed(0);
        setPosicionConductor(ruta[i]);
        const tiempoRestante = Math.max(
          0,
          Math.round(parseFloat(viaje.duracion) * (1 - i / ruta.length))
        );
        setViaje((v) => ({ ...v, progreso, tiempoRestante }));
      } else {
        clearInterval(intervaloViaje.current);
        setViaje((v) => ({ ...v, estado: "finalizado" }));
      }
    }, 800);
  };

  const finalizarViaje = () => {
    clearInterval(intervaloViaje.current);
    setViaje((v) => ({ ...v, estado: "finalizado" }));
  };

  const guardarHistorial = () => {
    const guardados = JSON.parse(localStorage.getItem("viajesColibri")) || [];
    const nuevo = {
      id: Date.now(),
      origen: `${viaje.origen?.lat?.toFixed(4)}, ${viaje.origen?.lng?.toFixed(4)}`,
      destino: `${viaje.destino?.lat?.toFixed(4)}, ${viaje.destino?.lng?.toFixed(4)}`,
      conductor: viaje.conductor?.nombre,
      costo,
      estado: "finalizado",
      calificacion,
      reseña: comentario,
    };
    localStorage.setItem("viajesColibri", JSON.stringify([...guardados, nuevo]));
  };

  const enviarReseña = () => {
    if (calificacion === 0) return;
    guardarHistorial();
    setEnviado(true);
    setTimeout(() => {
      setViaje({
        origen: null,
        destino: null,
        distancia: "",
        duracion: "",
        directions: null,
        estado: "pendiente",
        conductor: null,
      });
      setPosicionConductor(null);
      setCalificacion(0);
      setComentario("");
      setEnviado(false);
    }, 2000);
  };

  const renderEstrellas = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={star <= calificacion ? "activa" : ""}
        onClick={() => setCalificacion(star)}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Huitzilin</h1>

        <section className="map-section">
          <MapaRutas onSelect={handleSelect} marcadorConductor={posicionConductor} />
          
          {ubicacionActual && (
            <div className="ubicacion-actual">
              <span>Tu ubicación: {ubicacionActual}</span>
            </div>
          )}
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

              {viaje.estado === "buscando" && (
                <div>
                  <p className="buscando-titulo">
                    Buscando conductores disponibles...
                  </p>
                  <div className="ofertas-lista compacta">
                    {ofertas.map((o) => (
                      <div key={o.id} className="oferta-card compacta">
                        <div className="oferta-info">
                          <h3>{o.nombre}</h3>
                          <p>
                            ⭐ {o.rating} · {o.tiempo}
                          </p>
                          <p className="auto">
                            🚗 {o.auto}
                          </p>
                          <p className="oferta-timer">
                            ⏳ {o.restante}s restantes
                          </p>
                        </div>
                        <div className="oferta-precio">
                          <span>${o.precio}</span>
                          <button className="btn-estado verde" onClick={() => aceptarOferta(o)}>
                            Aceptar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viaje.estado === "asignado" && (
                <div className="viaje-actual">
                  <p>
                    Conductor asignado: <strong>{viaje.conductor?.nombre}</strong>
                  </p>
                  <button className="btn-estado verde" onClick={iniciarViaje} style={{ marginTop: "0.8rem" }}>
                    Iniciar viaje
                  </button>
                </div>
              )}

              {viaje.estado === "en-curso" && (
                <div className="viaje-actual">
                  <p>
                    En curso con {viaje.conductor?.nombre} · {viaje.tiempoRestante || viaje.duracion} min restantes
                  </p>
                  <div className="progreso-barra">
                    <div 
                      className="progreso-fill"
                      style={{ width: `${viaje.progreso || 0}%` }}
                    ></div>
                  </div>
                  <button className="btn-estado verde" onClick={finalizarViaje} style={{ marginTop: "0.8rem" }}>
                    Finalizar viaje
                  </button>
                </div>
              )}

              {viaje.estado === "finalizado" && !enviado && (
                <div className="viaje-actual finalizado">
                  <p>
                    Viaje finalizado con éxito.
                  </p>
                  <p style={{ marginTop: "0.8rem" }}>¿Cómo fue tu experiencia?</p>
                  <div className="estrellas">
                    {renderEstrellas()}
                  </div>
                  <textarea
                    className="reseña-input"
                    placeholder="Comparte tu experiencia..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  ></textarea>
                  <button className="btn-estado verde" onClick={enviarReseña} style={{ marginTop: "0.8rem" }}>
                    Enviar reseña
                  </button>
                </div>
              )}

              {enviado && (
                <div className="viaje-actual finalizado">
                  <p>
                    ¡Gracias por tu reseña!
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}