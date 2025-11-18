import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");

export default function HomeConductor() {
  const [activo, setActivo] = useState(false);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const [wallet, setWallet] = useState(0); // WALLET DE COMISIONES

  useEffect(() => {
  const email = localStorage.getItem("userEmail");
  if (!email) return;

  fetch(`http://localhost:4000/wallet/${email}`)
    .then(res => res.json())
    .then(data => setWallet(data.wallet || 0))
    .catch(err => console.error("Error wallet:", err));
}, []);

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

    socket.on("nuevo_viaje_disponible", (data) => {
      console.log("📢 Nueva solicitud de viaje detectada:", data);
      setSolicitud(data);
      setViaje((v) => ({ ...v, estado: "solicitud_pendiente" }));
    });

    socket.on("viaje_confirmado", (data) => {
      if (data.conductor.id !== localStorage.getItem("userEmail")) return;
      console.log("🟡 El pasajero confirmó primero, esperando respuesta del conductor:", data);
      setViaje((v) => ({
        ...v,
        estado: "esperando_confirmacion_conductor",
        pasajeroUbicacion: data.origen,
      }));
      setSolicitud(data);
    });

    socket.on("iniciar_recogida", (data) => {
      if (data.conductor.id === localStorage.getItem("userEmail")) {
        console.log("🟢 Ambas partes confirmaron. Inicia fase de recogida:", data);
        iniciarSimulacionHaciaPasajero(data);
      }
    });

    return () => {
      socket.off("nuevo_viaje_disponible");
      socket.off("viaje_confirmado");
      socket.off("iniciar_recogida");
    };
  }, [activo]);

  // === Simular ruta al pasajero ===
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
            pasajero: data.pasajero,
            destino: data.destino,
          }));

          const path = result.routes[0].overview_path;
          let i = 0;
          const total = path.length;

          intervaloRef.current = setInterval(() => {
            if (i < total) {
              const punto = path[i];
              setPosicionConductor({ lat: punto.lat(), lng: punto.lng() });
              setViaje((v) => ({ ...v, progreso: ((i / total) * 100).toFixed(0) }));
              i++;
            } else {
              clearInterval(intervaloRef.current);
              console.log("🏁 El conductor ha llegado al punto de recogida");
              setViaje((v) => ({ ...v, estado: "listo_para_iniciar" }));
              socket.emit("conductor_llego", { pasajero: data.pasajero });
            }
          }, 800);
        } else {
          console.warn("⚠️ No se pudo generar la ruta:", status);
        }
      }
    );
  };

  // === Simular viaje al destino ===
  const iniciarViaje = () => {
    console.log("🚀 Iniciando viaje hacia el destino...");
    if (!viaje.destino) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: posicionConductor,
        destination: viaje.destino,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          console.log("📍 Ruta al destino generada. Simulando trayecto...");
          setViaje((v) => ({
            ...v,
            directions: result,
            estado: "viaje_en_progreso",
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
              i++;
            } else {
              clearInterval(intervaloRef.current);
              console.log("🏁 El viaje ha llegado al destino final.");
              setViaje((v) => ({ ...v, estado: "viaje_finalizado" }));
              socket.emit("viaje_finalizado", { pasajero: viaje.pasajero });
            }
          }, 800);
        } else {
          console.warn("⚠️ Error al generar ruta al destino:", status);
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

  const cancelarConfirmacion = () => {
    console.log("❌ Conductor canceló la confirmación");
    socket.emit("cancelar_confirmacion", {
      conductor: localStorage.getItem("userEmail"),
      pasajero: solicitud?.pasajero,
    });
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    setSolicitud(null);
  };

  const rechazarViaje = () => {
    console.log("🔴 Conductor rechaza la solicitud:", solicitud);
    setSolicitud(null);
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    socket.emit("conductor_rechaza_viaje", {
      conductor: localStorage.getItem("userEmail"),
      pasajero: solicitud?.pasajero,
    });
  };

  // === FINALIZAR VIAJE + WALLET ===
  const finalizarViaje = () => {
    console.log("✅ Viaje finalizado correctamente.");

    const costoViaje = solicitud?.costo || 50; // si no manda costo, usa uno base
    const comision = costoViaje * 0.15;

    setWallet((prev) => prev + comision);
    console.log("💰 Comisión del viaje:", comision);
    console.log("💼 Wallet acumulado:", wallet + comision);

    setViaje((v) => ({
      directions: null,
      estado: "pendiente",
      progreso: 0,
    }));

    setSolicitud(null);
  };

  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Panel de Conductor</h1>

<div className="wallet-box">
  <p className="wallet-monto">${Number(wallet).toFixed(2)}</p>
  <p className="wallet-detalle">Comisiones pendientes</p>
</div>

        <section className="map-section">
          <MapaRutas marcadorConductor={posicionConductor} permitirRutas={false}  directions={viaje.directions} />
        </section>

        {/* === Nueva solicitud === */}
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
              <button className="btn-estado verde" onClick={aceptarViaje}>Aceptar viaje</button>
              <button className="btn-estado rojo" onClick={rechazarViaje}>Rechazar</button>
            </div>
          </div>
        )}

        {viaje.estado === "esperando_confirmacion" && (
          <div className="viaje-actual">
            <p>Esperando confirmación del pasajero...</p>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Cancelar viaje</button>
          </div>
        )}

        {viaje.estado === "esperando_confirmacion_conductor" && (
          <div className="viaje-actual">
            <p>El pasajero ya aceptó el viaje. ¿Deseas confirmar?</p>
            <div className="acciones">
              <button className="btn-estado verde" onClick={aceptarViaje}>Confirmar</button>
              <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Cancelar</button>
            </div>
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

        {viaje.estado === "listo_para_iniciar" && (
          <div className="viaje-actual">
            <p>Has llegado al punto de recogida. Esperando al pasajero...</p>
            <button className="btn-estado verde" onClick={iniciarViaje}>
              Iniciar viaje
            </button>
          </div>
        )}

        {viaje.estado === "viaje_en_progreso" && (
          <div className="viaje-actual">
            <p>En viaje hacia el destino...</p>
            <div className="progreso-barra">
              <div className="progreso-fill" style={{ width: `${viaje.progreso || 0}%` }}></div>
            </div>
          </div>
        )}

        {viaje.estado === "viaje_finalizado" && (
          <div className="viaje-actual">
            <p>🚩 Has llegado al destino.</p>
            <button className="btn-estado verde" onClick={finalizarViaje}>
              Finalizar viaje
            </button>
          </div>
        )}

        {/* === Estado general === */}
        <div className="trip-card">
          {!activo ? (
            <button className="home-button" onClick={() => {
              console.log("🟢 Conductor activado — esperando pasajeros...");
              setActivo(true);
            }}>Recibir Viajes</button>
          ) : (
            <div className="viaje-actual">
              <p>Estado: <strong>Activo</strong></p>
              <p>Esperando solicitudes...</p>
              <button className="btn-estado verde" style={{ background: "#F48C64" }} onClick={() => {
                console.log("⛔ Conductor detuvo la recepción de viajes");
                setActivo(false);
              }}>Detener</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
