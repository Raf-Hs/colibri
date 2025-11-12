import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");

export default function HomeConductor() {
  const [activo, setActivo] = useState(false);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const [viaje, setViaje] = useState({
    directions: null,
    estado: "pendiente",
    pasajeroUbicacion: null,
    progreso: 0,
  });
  const [solicitud, setSolicitud] = useState(null);
  const intervaloRef = useRef(null);

  // === Activar el conductor ===
  useEffect(() => {
    if (!socket) return;

    if (activo) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const datosConductor = {
          id: localStorage.getItem("userEmail"),
          nombre: localStorage.getItem("userEmail"),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("🚗 Conductor activo en:", datosConductor);
        socket.emit("conductor_activo", datosConductor);
        setPosicionConductor({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    } else {
      console.log("🔴 Conductor inactivo — no recibe solicitudes");
    }

    // === Nueva solicitud de viaje recibida ===
    socket.on("nuevo_viaje_disponible", (data) => {
      console.log("📢 Nueva solicitud de viaje detectada:", data);
      setSolicitud(data);
      setViaje((v) => ({ ...v, estado: "solicitud_pendiente" }));
    });

    // === Viaje confirmado ===
    socket.on("viaje_confirmado", (data) => {
      if (data.conductor.id !== localStorage.getItem("userEmail")) return;
      console.log("✅ Viaje confirmado. Iniciando trayecto hacia pasajero:", data);
      setSolicitud(null);
      iniciarSimulacionHaciaPasajero(data);
    });

    return () => {
      socket.off("nuevo_viaje_disponible");
      socket.off("viaje_confirmado");
    };
  }, [activo]);

  // === Simular trayecto hacia pasajero ===
  const iniciarSimulacionHaciaPasajero = (data) => {
    console.log("🧭 Calculando ruta hacia el pasajero...");
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: data.conductor.lat, lng: data.conductor.lng },
        destination: data.origen,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          console.log("✅ Ruta generada, iniciando simulación visual...");
          setViaje((v) => ({
            ...v,
            directions: result,
            estado: "conductor_en_camino",
            progreso: 0,
          }));

          const path = result.routes[0].overview_path;
          let i = 0;
          const total = path.length;

          intervaloRef.current = setInterval(() => {
            if (i < total) {
              const punto = path[i];
              setPosicionConductor({ lat: punto.lat(), lng: punto.lng() });
              setViaje((v) => ({ ...v, progreso: ((i / total) * 100).toFixed(0) }));
              if (i % 10 === 0)
                console.log(`📍 Avanzando por la ruta (${((i / total) * 100).toFixed(0)}%)`);
              i++;
            } else {
              clearInterval(intervaloRef.current);
              socket.emit("conductor_llego", { pasajero: data.pasajero });
              console.log("🏁 El conductor ha llegado al punto de recogida");
              setViaje((v) => ({ ...v, estado: "listo_para_iniciar" }));
            }
          }, 1000);
        } else {
          console.warn("⚠️ No se pudo generar la ruta:", status);
        }
      }
    );
  };

  // === Conductor acepta viaje ===
  const aceptarViaje = () => {
    if (!solicitud) return;
    console.log("🟢 Conductor acepta el viaje:", solicitud);

    socket.emit("conductor_acepta_viaje", {
      conductor: {
        id: localStorage.getItem("userEmail"),
        nombre: localStorage.getItem("userEmail"),
        lat: posicionConductor.lat,
        lng: posicionConductor.lng,
      },
      pasajero: solicitud.pasajero,
      origen: solicitud.origen,
      destino: solicitud.destino,
    });

    setViaje((v) => ({ ...v, estado: "esperando_confirmacion" }));
  };

  // === Conductor rechaza viaje ===
  const rechazarViaje = () => {
    console.log("🔴 Conductor rechaza la solicitud:", solicitud);
    setSolicitud(null);
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    socket.emit("conductor_rechaza_viaje", {
      conductor: localStorage.getItem("userEmail"),
      pasajero: solicitud?.pasajero,
    });
  };

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Panel de Conductor</h1>

        <section className="map-section">
          <MapaRutas marcadorConductor={posicionConductor} directions={viaje.directions} />
        </section>

        {/* === Nueva solicitud de viaje === */}
        {solicitud && viaje.estado === "solicitud_pendiente" && (
          <div className="oferta-card">
            <div className="oferta-info">
              <h3>Nuevo viaje solicitado</h3>
              <p><strong>Pasajero:</strong> {solicitud.pasajero}</p>
              <p><strong>Origen:</strong> {solicitud.origenTexto || "Punto A"}</p>
              <p><strong>Destino:</strong> {solicitud.destinoTexto || "Punto B"}</p>
              <p><strong>Distancia:</strong> {solicitud.distancia}</p>
            </div>
            <div className="oferta-precio">
              <button className="btn-estado verde" onClick={aceptarViaje}>
                Aceptar viaje
              </button>
              <button
                className="btn-estado rojo"
                onClick={rechazarViaje}
                style={{ marginLeft: "0.5rem" }}
              >
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* === Estados del viaje === */}
        {viaje.estado === "esperando_confirmacion" && (
          <div className="viaje-actual">
            <p>Esperando confirmación del pasajero...</p>
          </div>
        )}

        {viaje.estado === "conductor_en_camino" && (
          <div className="viaje-actual">
            <p>Dirigiéndote al punto de recogida...</p>
            <div className="progreso-barra">
              <div className="progreso-fill" style={{ width: `${viaje.progreso || 0}%` }}></div>
            </div>
          </div>
        )}

        {/* === Control de estado (activar / detener) === */}
        <div className="trip-card">
          {!activo ? (
            <button
              className="home-button"
              onClick={() => {
                console.log("🟢 Conductor activado — esperando pasajeros...");
                setActivo(true);
              }}
            >
              Recibir Viajes
            </button>
          ) : (
            <div className="viaje-actual">
              <p>Estado: <strong>Activo</strong></p>
              <p>Esperando solicitudes...</p>
              <button
                className="btn-estado verde"
                style={{ background: "#F48C64" }}
                onClick={() => {
                  console.log("⛔ Conductor detuvo la recepción de viajes");
                  setActivo(false);
                }}
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
