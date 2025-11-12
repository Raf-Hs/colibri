import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");

export default function HomePasajero() {
  const [viaje, setViaje] = useState({
    origen: null,
    destino: null,
    distancia: "",
    duracion: "",
    directions: null,
    estado: "pendiente",
    conductor: null,
    rutaConductorPasajero: null,
  });
  const [ofertas, setOfertas] = useState([]);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const intervaloViaje = useRef(null);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSelect = (data) => {
    console.log("📍 Nueva selección detectada:", data);
    setViaje((prev) => ({ ...prev, ...data }));
  };

  // === Calcular tarifa estimada ===
  const calcularCosto = () => {
    if (!viaje.distancia) return 0;
    const km = parseFloat(viaje.distancia.replace(" km", "").replace(",", "."));
    const base = 25;
    const porKm = 8.5;
    return (base + km * porKm).toFixed(2);
  };
  const costo = calcularCosto();

  // === Detectar conexión de sockets ===
  useEffect(() => {
    console.log("🟢 Socket conectado para pasajero:", localStorage.getItem("userEmail"));
  }, []);

  // === Escuchar eventos del servidor ===
  useEffect(() => {
    socket.on("ofertas", (conductores) => {
      console.log("📡 Conductores disponibles detectados:", conductores);
      setOfertas(
        conductores.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          rating: 4.8,
          tiempo: "3 min",
          modelo: c.modelo || "Desconocido",
          restante: 30,
        }))
      );
    });

    socket.on("actualizar_ruta_conductor", (data) => {
      console.log("🚗 Actualizando ruta del conductor hacia el pasajero:", data);
      const svc = new window.google.maps.DirectionsService();
      svc.route(
        {
          origin: data.conductorPos,
          destination: data.pasajeroPos,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            console.log("✅ Ruta del conductor al pasajero calculada correctamente");
            setViaje((v) => ({ ...v, rutaConductorPasajero: result }));
          } else {
            console.warn("⚠️ Error generando ruta:", status);
          }
        }
      );
    });

    return () => {
      socket.off("ofertas");
      socket.off("actualizar_ruta_conductor");
    };
  }, []);

  // === Solicitar viaje ===
  const solicitarViaje = () => {
    if (!viaje.directions || !viaje.origen) return;
    console.log("🧭 Pasajero solicitando viaje con datos:", viaje);
    setViaje((v) => ({ ...v, estado: "buscando" }));
    setOfertas([]);

    socket.emit("buscar_conductor", {
    pasajero: localStorage.getItem("userEmail"),
    origen: viaje.origen,
    destino: viaje.destino,
    distancia: viaje.distancia,
    duracion: viaje.duracion,
    costo: costo,
    });

    console.log("📤 Evento enviado: nuevo_viaje_disponible");
  };

  // === Cancelar búsqueda ===
  const cancelarBusqueda = () => {
    console.log("🛑 Pasajero canceló la búsqueda");
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    setOfertas([]);
    socket.emit("cancelar_busqueda", {
      pasajero: localStorage.getItem("userEmail"),
    });
  };

  // === Aceptar oferta ===
  const aceptarOferta = (oferta) => {
    console.log("✅ Pasajero aceptó oferta del conductor:", oferta);
    setViaje((v) => ({ ...v, estado: "esperando_conductor", conductor: oferta }));
    setOfertas([]);

    socket.emit("conductor_asignado", {
      conductor: oferta,
      pasajero: localStorage.getItem("userEmail"),
      origen: viaje.origen,
    });

    socket.emit("mostrar_ubicacion_pasajero", {
      conductorId: oferta.id,
      pasajeroUbicacion: viaje.origen,
      pasajero: localStorage.getItem("userEmail"),
    });
  };

  // === Mostrar estrellas ===
  const renderEstrellas = () =>
    [1, 2, 3, 4, 5].map((s) => (
      <span
        key={s}
        className={s <= calificacion ? "activa" : ""}
        onClick={() => setCalificacion(s)}
      >
        ★
      </span>
    ));

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Huitzilin</h1>

        {/* === MAPA === */}
        <section className="map-section">
          <MapaRutas
            onSelect={handleSelect}
            marcadorConductor={posicionConductor}
            directions={viaje.directions}
            rutaConductorPasajero={viaje.rutaConductorPasajero}
          />
        </section>

        {/* === Info de la tarifa antes de solicitar === */}
        {viaje.directions && viaje.estado === "pendiente" && (
          <div className="trip-miniinfo">
            <p><strong>Distancia:</strong> {viaje.distancia || "—"}</p>
            <p><strong>Duración:</strong> {viaje.duracion || "—"}</p>
            <p><strong>Tarifa estimada:</strong> ${costo}</p>
          </div>
        )}

        {/* === Solicitar viaje === */}
        {viaje.estado === "pendiente" && viaje.directions && (
          <button className="home-button" onClick={solicitarViaje}>
            Solicitar viaje
          </button>
        )}

        {/* === Estado BUSCANDO === */}
        {viaje.estado === "buscando" && (
          <div>
            <p className="buscando-titulo">Buscando conductores disponibles...</p>

            <div className="ofertas-lista compacta">
              {ofertas.map((o) => (
                <div key={o.id} className="oferta-card compacta">
                  <div className="oferta-info">
                    <h3>{o.nombre}</h3>
                    <p>⭐ {o.rating} · {o.tiempo}</p>
                    <p className="auto">🚗 {o.modelo}</p>
                    <p className="oferta-timer">⏳ {o.restante}s</p>
                  </div>
                  <div className="oferta-precio">
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

            <button
              className="btn-estado rojo"
              style={{ marginTop: "1rem" }}
              onClick={cancelarBusqueda}
            >
              Cancelar búsqueda
            </button>
          </div>
        )}

        {/* === Esperando conductor === */}
        {viaje.estado === "esperando_conductor" && (
          <div className="viaje-actual">
            <p>Esperando al conductor...</p>
          </div>
        )}
      </div>
    </div>
  );
}
