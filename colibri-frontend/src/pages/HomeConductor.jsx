// 🔥🔥🔥 HOME CONDUCTOR — COMPLETO, CON SIMULACIÓN, TOUR, REVIEWS, SELECTORES COMPACTOS 🔥🔥🔥

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("http://localhost:4000");
const UMBRAL_METROS = 30;

// === SIMULADOR DE REVIEWS PASAJERO ===
function simularResumenReviewsPasajero() {
  const mocks = [
    { promedio: 4.8, ultimoComentario: "Muy respetuoso y puntual." },
    { promedio: 4.6, ultimoComentario: "Buen trato durante el viaje." },
    { promedio: 4.9, ultimoComentario: "Excelente pasajero, sin problemas." },
    { promedio: 4.7, ultimoComentario: "Pago rápido y amable." },
    { promedio: 5.0, ultimoComentario: "Experiencia perfecta." }
  ];
  return mocks[Math.floor(Math.random() * mocks.length)];
}

// === SIMULADOR DE TOUR ===
function simularResumenTour() {
  return {
    precioDia: 850,
    horas: 5,
    nota: "Ruta turística por cascadas, miradores y zona centro."
  };
}

export default function HomeConductor() {
  const [activo, setActivo] = useState(false);
  const [aceptaTours, setAceptaTours] = useState(false);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [capacidad, setCapacidad] = useState(4);
  const [modoDemo, setModoDemo] = useState(false);

  const [viaje, setViaje] = useState({
    directions: null,
    estado: "pendiente",
    pasajero: null,
    origen: null,
    destino: null,
    progreso: 0,
    tipo: "normal"
  });

  const [solicitud, setSolicitud] = useState(null);

  const intervaloRef = useRef(null);
  const watchIdRef = useRef(null);

  // === DISTANCIA EN METROS ===
  const dist = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3;
    const toRad = d => (d * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const stopSim = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = null;
  };

  const stopWatch = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // === WALLET ===
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;
    fetch(`http://localhost:4000/wallet/${email}`)
      .then(r => r.json())
      .then(d => setWallet(d.balance || 0));
  }, []);

  // ======================================================
  // SOCKETS
  // ======================================================
  useEffect(() => {
    if (!socket) return;

    // Conductor activo
    if (activo) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const data = {
          email: localStorage.getItem("userEmail"),
          nombre: localStorage.getItem("userEmail"),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          capacidad,
          sexo: localStorage.getItem("sexo") || "hombre",
          aceptaTours
        };

        socket.emit("conductor_activo", data);
        setPosicionConductor({ lat: data.lat, lng: data.lng });
      });
    } else {
      stopSim();
      stopWatch();
    }

    // === SOLICITUD NORMAL ===
    socket.on("nuevo_viaje_disponible", (data) => {
      const review = simularResumenReviewsPasajero();

      if (data.tipoSolicitud === "tour") {
        const t = simularResumenTour();
        setSolicitud({
          ...data,
          tipo: "tour",
          tourPrecio: t.precioDia,
          tourHoras: t.horas,
          tourNota: t.nota,
          reviewPromedio: review.promedio,
          reviewComentario: review.ultimoComentario
        });

        setViaje(v => ({
          ...v,
          tipo: "tour",
          estado: "solicitud_pendiente",
          pasajero: data.pasajero
        }));
        return;
      }

      setSolicitud({
        ...data,
        tipo: "normal",
        reviewPromedio: review.promedio,
        reviewComentario: review.ultimoComentario
      });

      setViaje(v => ({
        ...v,
        estado: "solicitud_pendiente",
        pasajero: data.pasajero,
        origen: data.origen,
        destino: data.destino
      }));
    });

    // === PASAJERO ACEPTA ===
    socket.on("viaje_confirmado", (data) => {
      if (data.conductor.id !== localStorage.getItem("userEmail")) return;

      setViaje(v => ({
        ...v,
        estado: "esperando_confirmacion_conductor",
        pasajero: data.pasajero,
        origen: data.origen,
        destino: data.destino
      }));

      setSolicitud(s => ({ ...s, ...data }));
    });

    // === AMBOS ACEPTAN → INICIA RECOGIDA ===
    socket.on("iniciar_recogida", (data) => {
      if (data.conductor.id !== localStorage.getItem("userEmail")) return;

      setViaje(v => ({
        ...v,
        pasajero: data.pasajero,
        origen: data.origen,
        destino: data.destino
      }));

      modoDemo ? iniciarSimRecoger(data) : iniciarGPSRecoger(data);
    });

    // === CANCELACIÓN EMERGENCIA ===
    socket.on("viaje_cancelado_emergencia", () => {
      stopSim();
      stopWatch();
      setSolicitud(null);
      setViaje({
        directions: null,
        estado: "pendiente",
        pasajero: null,
        origen: null,
        destino: null,
        progreso: 0,
        tipo: "normal"
      });
    });

    return () => {
      socket.off("nuevo_viaje_disponible");
      socket.off("viaje_cancelado_emergencia");
      socket.off("viaje_confirmado");
      socket.off("iniciar_recogida");
    };
  }, [activo, capacidad, modoDemo, aceptaTours]);

  // ======================================================
  // GPS HACIA PASAJERO
  // ======================================================
  const iniciarGPSRecoger = (data) => {
    stopSim();
    stopWatch();

    setViaje(v => ({ ...v, estado: "conductor_en_camino_real", progreso: 0 }));

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      setPosicionConductor({ lat: latitude, lng: longitude });

      socket.emit("posicion_conductor", {
        pasajero: data.pasajero,
        lat: latitude,
        lng: longitude
      });

      if (dist(latitude, longitude, data.origen.lat, data.origen.lng) <= UMBRAL_METROS) {
        stopWatch();
        setViaje(v => ({ ...v, estado: "listo_para_iniciar" }));
        socket.emit("conductor_llego", { pasajero: data.pasajero });
      }
    });

    watchIdRef.current = watchId;
  };

  // ======================================================
  // GPS HACIA DESTINO
  // ======================================================
  const iniciarGPSDestino = () => {
    if (!viaje.destino) return;

    stopSim();
    stopWatch();

    setViaje(v => ({ ...v, estado: "viaje_en_progreso_real" }));

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      setPosicionConductor({ lat: latitude, lng: longitude });
      socket.emit("posicion_conductor", {
        pasajero: viaje.pasajero,
        lat: latitude,
        lng: longitude
      });

      if (dist(latitude, longitude, viaje.destino.lat, viaje.destino.lng) <= UMBRAL_METROS) {
        stopWatch();
        setViaje(v => ({ ...v, estado: "viaje_finalizado" }));
      }
    });

    watchIdRef.current = watchId;
  };

// ======================================================
// SIMULACIÓN HACIA PASAJERO
// ======================================================
const iniciarSimRecoger = (data) => {
  stopSim();
  stopWatch();

  const ds = new window.google.maps.DirectionsService();

  ds.route(
    {
      origin: { lat: data.conductor.lat, lng: data.conductor.lng },
      destination: data.origen,
      travelMode: "DRIVING"
    },
    (result, status) => {
      if (status !== "OK") return;

      setViaje(v => ({
        ...v,
        directions: result,
        estado: "conductor_en_camino",
        progreso: 0
      }));

      const path = result.routes[0].overview_path;
      let i = 0;

      intervaloRef.current = setInterval(() => {
        if (i >= path.length) {
          stopSim();
          setViaje(v => ({ ...v, estado: "listo_para_iniciar" }));

          socket.emit("conductor_llego", { pasajero: data.pasajero });
          return;
        }

        const p = path[i];
        const porcentaje = ((i / path.length) * 100).toFixed(0);

        setPosicionConductor({ lat: p.lat(), lng: p.lng() });
        setViaje(v => ({ ...v, progreso: porcentaje }));

        // 🔥 Enviar al pasajero la posición + progreso
        socket.emit("posicion_conductor", {
          pasajero: data.pasajero,
          lat: p.lat(),
          lng: p.lng(),
          progreso: porcentaje
        });

        i++;
      }, 800);
    }
  );
};
// ======================================================
// SIMULACIÓN HACIA DESTINO
// ======================================================
const iniciarSimDestino = () => {
  if (!viaje.destino) return;

  stopSim();
  stopWatch();

  const ds = new window.google.maps.DirectionsService();

  ds.route(
    {
      origin: posicionConductor,
      destination: viaje.destino,
      travelMode: "DRIVING"
    },
    (result, status) => {
      if (status !== "OK") return;

      setViaje(v => ({
        ...v,
        directions: result,
        estado: "viaje_en_progreso",
        progreso: 0
      }));

      const path = result.routes[0].overview_path;
      let i = 0;

      intervaloRef.current = setInterval(() => {
        if (i >= path.length) {
          stopSim();

          setViaje(v => ({ ...v, estado: "viaje_finalizado" }));

          socket.emit("viaje_finalizado", {
            pasajero: viaje.pasajero,
            conductor: localStorage.getItem("userEmail")
          });

          return;
        }

        const p = path[i];
        const porcentaje = ((i / path.length) * 100).toFixed(0);

        setPosicionConductor({ lat: p.lat(), lng: p.lng() });
        setViaje(v => ({ ...v, progreso: porcentaje }));

        // 🔥 Enviar al pasajero la posición + progreso
        socket.emit("posicion_conductor", {
          pasajero: viaje.pasajero,
          lat: p.lat(),
          lng: p.lng(),
          progreso: porcentaje
        });

        i++;
      }, 800);
    }
  );
};


  // ======================================================
  // ACCIONES
  // ======================================================
  const aceptarViaje = () => {
    if (!solicitud) return;

    if (solicitud.tipo === "tour") {
      socket.emit("conductor_acepta_viaje", {
        conductor: { id: localStorage.getItem("userEmail") },
        pasajero: solicitud.pasajero,
        tipoSolicitud: "tour"
      });

      setViaje(v => ({ ...v, estado: "tour_en_progreso" }));
      return;
    }

    socket.emit("conductor_acepta_viaje", {
      conductor: {
        id: localStorage.getItem("userEmail"),
        nombre: localStorage.getItem("userEmail"),
        lat: posicionConductor?.lat,
        lng: posicionConductor?.lng
      },
      pasajero: solicitud.pasajero,
      origen: solicitud.origen,
      destino: solicitud.destino
    });

    setViaje(v => ({ ...v, estado: "esperando_confirmacion" }));
  };

  const cancelarConfirmacion = () => {
    socket.emit("cancelar_confirmacion", {
      conductor: localStorage.getItem("userEmail"),
      pasajero: solicitud?.pasajero
    });

    stopSim();
    stopWatch();

    setSolicitud(null);
    setViaje({
      directions: null,
      estado: "pendiente",
      pasajero: null,
      destino: null,
      origen: null,
      progreso: 0,
      tipo: "normal"
    });
  };

  const finalizarTour = () => {
    const pago = solicitud.tourPrecio;

    setWallet(prev => prev + pago);
    fetch(
      `http://localhost:4000/wallet/sumar/${localStorage.getItem("userEmail")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: pago })
      }
    );

    setSolicitud(null);
    setViaje({
      directions: null,
      estado: "pendiente",
      pasajero: null,
      destino: null,
      origen: null,
      progreso: 0,
      tipo: "normal"
    });
  };

  const finalizarViaje = () => {
    const costo = solicitud?.costo || 50;
    const comision = costo * 0.15;

    setWallet(prev => prev + comision);

    fetch(
      `http://localhost:4000/wallet/sumar/${localStorage.getItem("userEmail")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: comision })
      }
    );

    stopSim();
    stopWatch();

    setSolicitud(null);
    setViaje({
      directions: null,
      estado: "pendiente",
      pasajero: null,
      destino: null,
      origen: null,
      progreso: 0,
      tipo: "normal"
    });
  };

  // ======================================================
  // RENDER UI
  // ======================================================

  return (
    <div className="home-container">
      <div className="home-box">

        <h1 className="home-title">Panel de Conductor</h1>

        {/* === FILA COMPLETA === */}
        <div className="selector-row full">

          <div className="selector-item tiny">
            <label>Aceptar tours:</label>
            <input
              type="checkbox"
              checked={aceptaTours}
              onChange={(e) => setAceptaTours(e.target.checked)}
            />
          </div>

          <div className="selector-item tiny">
            <label>Modo demo:</label>
            <input
              type="checkbox"
              checked={modoDemo}
              onChange={(e) => {
                stopSim();
                stopWatch();
                setModoDemo(e.target.checked);
              }}
            />
          </div>

          {!activo && (
            <div className="selector-item tiny">
              <label>Capacidad:</label>
              <select
                value={capacidad}
                onChange={(e) => setCapacidad(+e.target.value)}
                className="input-capacidad"
              >
                {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          )}

          <div className="wallet-mini-card inline">
            <div className="wallet-mini-amount">${wallet.toFixed(2)}</div>
            <div className="wallet-mini-label">Comisiones</div>
          </div>

        </div>

        {/* MAPA */}
        <section className="map-section">
          <MapaRutas
            marcadorConductor={posicionConductor}
            directions={viaje.directions}
          />
        </section>

        {/* === SOLICITUD TOUR === */}
        {solicitud && solicitud.tipo === "tour" && viaje.estado === "solicitud_pendiente" && (
          <div className="oferta-card">
            <h3>💼 Solicitud de TOUR</h3>
            <p><strong>Pasajero:</strong> {solicitud.pasajero}</p>

            <div className="review-mini-box">
              <p>⭐ {solicitud.reviewPromedio.toFixed(1)}</p>
              <p className="review-mini">"{solicitud.reviewComentario}"</p>
            </div>

            <p><strong>Duración:</strong> {solicitud.tourHoras} horas</p>
            <p><strong>Pago:</strong> ${solicitud.tourPrecio}</p>
            <p><em>{solicitud.tourNota}</em></p>

            <button className="btn-estado verde" onClick={aceptarViaje}>Aceptar</button>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Rechazar</button>
          </div>
        )}

        {/* TOUR EN PROGRESO */}
        {viaje.tipo === "tour" && viaje.estado === "tour_en_progreso" && (
          <div className="viaje-actual">
            <h3>🗺️ Tour en progreso</h3>
            <p>Acompañando al pasajero...</p>
            <button className="btn-estado verde" onClick={finalizarTour}>Finalizar Tour</button>
          </div>
        )}

        {/* === SOLICITUD NORMAL === */}
        {solicitud && solicitud.tipo === "normal" && viaje.estado === "solicitud_pendiente" && (
          <div className="oferta-card">
            <h3>Nuevo viaje solicitado</h3>

            <p><strong>Pasajero:</strong> {solicitud.pasajero}</p>

            <div className="review-mini-box">
              <p>⭐ {solicitud.reviewPromedio.toFixed(1)}</p>
              <p className="review-mini">"{solicitud.reviewComentario}"</p>
            </div>

            <p><strong>Origen:</strong> {solicitud.origenTexto || "Punto A"}</p>
            <p><strong>Destino:</strong> {solicitud.destinoTexto || "Punto B"}</p>

            <button className="btn-estado verde" onClick={aceptarViaje}>Aceptar</button>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Rechazar</button>
          </div>
        )}

        {/* ESTADOS */}
        {viaje.estado === "esperando_confirmacion" && (
          <div className="viaje-actual">
            <p>Esperando confirmación del pasajero...</p>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Cancelar viaje</button>
          </div>
        )}

        {viaje.estado === "esperando_confirmacion_conductor" && (
          <div className="viaje-actual">
            <p>El pasajero ya aceptó. ¿Confirmas?</p>
            <button className="btn-estado verde" onClick={aceptarViaje}>Confirmar</button>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>Cancelar</button>
          </div>
        )}

        {viaje.estado === "conductor_en_camino_real" && (
          <div className="viaje-actual"><p>En camino (GPS real)...</p></div>
        )}

        {viaje.estado === "conductor_en_camino" && (
          <div className="viaje-actual">
            <p>En camino (Simulación)...</p>
            <div className="progreso-barra">
              <div className="progreso-fill" style={{ width: `${viaje.progreso}%` }} />
            </div>
          </div>
        )}

        {viaje.estado === "listo_para_iniciar" && (
          <div className="viaje-actual">
            <p>Has llegado al pasajero.</p>
            <button className="btn-estado verde" onClick={() => modoDemo ? iniciarSimDestino() : iniciarGPSDestino()}>
              Iniciar viaje
            </button>
          </div>
        )}

        {viaje.estado === "viaje_en_progreso_real" && (
          <div className="viaje-actual"><p>En viaje (GPS)...</p></div>
        )}

        {viaje.estado === "viaje_en_progreso" && (
          <div className="viaje-actual">
            <p>En viaje (Simulación)...</p>
            <div className="progreso-barra">
              <div className="progreso-fill" style={{ width: `${viaje.progreso}%` }} />
            </div>
          </div>
        )}

        {viaje.estado === "viaje_finalizado" && (
          <div className="viaje-actual">
            <p>Viaje finalizado</p>
            <button className="btn-estado verde" onClick={finalizarViaje}>
              Finalizar viaje
            </button>
          </div>
        )}

        {/* === BOTÓN ON/OFF === */}
        {!activo ? (
          <button className="home-button" onClick={() => setActivo(true)}>Recibir Viajes</button>
        ) : (
          <button
            className="home-button"
            style={{ background: "#F48C64" }}
            onClick={() => {
              stopSim();
              stopWatch();
              setActivo(false);
            }}
          >
            Detener
          </button>
        )}

      </div>
    </div>
  );
}
