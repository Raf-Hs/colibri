// 🔥🔥🔥 HOME PASAJERO — COMPLETO CON SOPORTE DE SIMULACIÓN Y PROGRESO 🔥🔥🔥

import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");
const UMBRAL_METROS = 40;

// === SIMULADOR DE REVIEWS ===
function simularResumenReviews() {
  const mocks = [
    { promedio: 4.8, ultimoComentario: "Excelente servicio" },
    { promedio: 4.6, ultimoComentario: "Muy amable" },
    { promedio: 4.9, ultimoComentario: "Viaje seguro y rápido" },
    { promedio: 4.7, ultimoComentario: "Conductor puntual" },
    { promedio: 5.0, ultimoComentario: "Perfecto en todo" }
  ];
  return mocks[Math.floor(Math.random() * mocks.length)];
}

export default function HomePasajero() {

  // ======================================================
  // ESTADO PRINCIPAL
  // ======================================================
  const [viaje, setViaje] = useState({
    origen: null,
    destino: null,
    origenTexto: null,
    destinoTexto: null,
    distancia: "",
    duracion: "",
    directions: null,
    estado: "pendiente",
    conductor: null,
    progreso: 0,
    idHistorial: null
  });

  const [ofertas, setOfertas] = useState([]);
  const [posicionConductor, setPosicionConductor] = useState(null);

  const [alertaProximidad, setAlertaProximidad] = useState(false);
  const [mensajeSistema, setMensajeSistema] = useState(null);

  const [preferenciaSexo, setPreferenciaSexo] = useState("cualquiera");
  const [pasajeros, setPasajeros] = useState(1);

  const [mostrarReview, setMostrarReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState("");

  const [modoTour, setModoTour] = useState(false);
  const [destinosTour, setDestinosTour] = useState([]);

  const autoConductor = {
    modelo: "Nissan Versa 2020",
    color: "Gris Plata",
    placas: "UAS-342-B"
  };

  const calcularCosto = () => {
    if (!viaje.distancia) return 0;
    const km = parseFloat(viaje.distancia.replace(" km", "").replace(",", "."));
    return (25 + km * 8.5).toFixed(2);
  };

  const costo = calcularCosto();

  const handleSelect = (data) => {
    setViaje((prev) => ({ ...prev, ...data }));
  };

  // ======================================================
  // SOCKETS PRINCIPALES
  // ======================================================
  useEffect(() => {

    // 1) CONDUCTORES DISPONIBLES
    socket.on("ofertas", (conductores) => {
      const lista = conductores.map((c) => {
        const rev = simularResumenReviews();
        return {
          id: c.id,
          nombre: c.nombre,
          email: c.email,
          rating: rev.promedio,
          ultimoComentario: rev.ultimoComentario,
          tiempo: "3 min",
          modelo: c.modelo || "Desconocido"
        };
      });

      setOfertas(lista);
    });

    // 2) EMERGENCIA
    socket.on("viaje_cancelado_emergencia", () => {
      setMensajeSistema("⚠️ Viaje cancelado por emergencia.");
      resetViaje();
    });

    socket.on("alerta_emergencia", (data) => {
      setMensajeSistema(data.mensaje);
    });

    // 3) CONDUCTOR ACEPTA (esperando al pasajero)
    socket.on("viaje_confirmado", (data) => {
      if (data.pasajero !== localStorage.getItem("userEmail")) return;

      setViaje((v) => ({
        ...v,
        estado: "esperando_confirmacion_pasajero",
        conductor: data.conductor,
        origen: data.origen,
        destino: data.destino
      }));
    });

    // 4) INICIA RECOGIDA
    socket.on("iniciar_recogida", (data) => {
      if (data.pasajero !== localStorage.getItem("userEmail")) return;

      setViaje((v) => ({
        ...v,
        estado: "conductor_en_camino",
        conductor: data.conductor
      }));
    });

    // 5) CONDUCTOR LLEGÓ
    socket.on("conductor_llego", (data) => {
      if (data.pasajero !== localStorage.getItem("userEmail")) return;

      setViaje((v) => ({ ...v, estado: "listo_para_iniciar" }));
      setMensajeSistema("El conductor llegó 🚗");
    });

    // 6) VIAJE FINALIZADO
    socket.on("viaje_finalizado", async (data) => {
      if (data.pasajero !== localStorage.getItem("userEmail")) return;

      try {
        const res = await fetch("https://colibri-backend-od5b.onrender.com/historial/guardar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({
            pasajero: data.pasajero,
            origen: viaje.origenTexto,
            destino: viaje.destinoTexto,
            costo,
            estado: "finalizado",
            conductor: viaje.conductor?.email,
            distancia: viaje.distancia,
            duracion: viaje.duracion
          })
        });

        const saved = await res.json();

        setViaje((v) => ({
          ...v,
          idHistorial: saved.id,
          estado: "finalizado"
        }));

        setMostrarReview(true);

      } catch (err) {
        console.error("❌ Error guardando viaje:", err);
      }
    });

    // 7) POSICIÓN DEL CONDUCTOR (GPS + Simulación)
    socket.on("posicion_conductor", (data) => {

      // 🔥 Aplica tanto para GPS real como simulación
      setPosicionConductor({ lat: data.lat, lng: data.lng });

      // 🔥 Progreso sincronizado del viaje (solo sim)
      if (data.progreso !== undefined) {
        setViaje(v => ({ ...v, progreso: data.progreso }));
      }

      // alerta de cercanía
      if (viaje.origen) {
        const dist = distanciaMetros(
          data.lat, data.lng,
          viaje.origen.lat, viaje.origen.lng
        );

        if (dist <= UMBRAL_METROS && !alertaProximidad) {
          setAlertaProximidad(true);
        }
      }
    });

    return () => {
      socket.off("ofertas");
      socket.off("viaje_confirmado");
      socket.off("iniciar_recogida");
      socket.off("conductor_llego");
      socket.off("posicion_conductor");
      socket.off("alerta_emergencia");
      socket.off("viaje_cancelado_emergencia");
      socket.off("viaje_finalizado");
    };
  }, []);

  // ======================================================
  // SOLICITAR VIAJE / TOUR
  // ======================================================
  const solicitarViaje = () => {
    if (!viaje.origen) return;

    setViaje((v) => ({ ...v, estado: "buscando" }));
    setOfertas([]);

    if (modoTour) {
      socket.emit("buscar_tour", {
        pasajero: localStorage.getItem("userEmail"),
        origen: viaje.origen,
        destinos: destinosTour,
        preferenciaSexo,
        pasajeros
      });
      return;
    }

    socket.emit("buscar_conductor", {
      pasajero: localStorage.getItem("userEmail"),
      origen: viaje.origen,
      destino: viaje.destino,
      distancia: viaje.distancia,
      duracion: viaje.duracion,
      origenTexto: viaje.origenTexto,
      destinoTexto: viaje.destinoTexto,
      costo,
      preferenciaSexo,
      pasajeros
    });
  };

  const cancelarBusqueda = () => {
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    setOfertas([]);
  };

  const aceptarOferta = (conductor) => {
    if (modoTour) {
      setViaje((v) => ({
        ...v,
        estado: "esperando_conductor",
        conductor
      }));

      setOfertas([]);

      socket.emit("conductor_asignado_tour", {
        pasajero: localStorage.getItem("userEmail"),
        origen: viaje.origen,
        destinos: destinosTour,
        conductor
      });
      return;
    }

    setViaje((v) => ({
      ...v,
      estado: "esperando_conductor",
      conductor
    }));

    setOfertas([]);

    socket.emit("conductor_asignado", {
      pasajero: localStorage.getItem("userEmail"),
      origen: viaje.origen,
      destino: viaje.destino,
      conductor
    });
  };

  // ======================================================
  // RESEÑAS
  // ======================================================
  const enviarReview = async () => {
    try {
      const autor = localStorage.getItem("userEmail");
      const destino = viaje.conductor?.email;

      await fetch("https://colibri-backend-od5b.onrender.com/reviews/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autorId: autor,
          destinoId: destino,
          viajeId: viaje.idHistorial,
          rating,
          comentario
        })
      });

      setMostrarReview(false);

    } catch (err) {
      console.error("❌ Error reseña:", err);
    }
  };

  // ======================================================
  // RESET
  // ======================================================
  const resetViaje = () => {
    setViaje({
      origen: null,
      destino: null,
      origenTexto: null,
      destinoTexto: null,
      distancia: "",
      duracion: "",
      directions: null,
      estado: "pendiente",
      conductor: null,
      progreso: 0,
      idHistorial: null
    });

    setOfertas([]);
    setPosicionConductor(null);
    setAlertaProximidad(false);
    setMensajeSistema(null);
    setDestinosTour([]);
    setModoTour(false);
  };

  const cancelarConfirmacion = () => {
    socket.emit("cancelar_confirmacion", {
      pasajero: localStorage.getItem("userEmail")
    });
    resetViaje();
  };

  // ======================================================
  // UI / RENDER
  // ======================================================
  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Huitzilin</h1>

        {/* MAPA */}
        <section className="map-section">
          <MapaRutas
            onSelect={handleSelect}
            permitirRutas={true}
            marcadorConductor={posicionConductor}
            directions={viaje.directions}
          />
        </section>

        {/* SELECTORES */}
        {viaje.estado === "pendiente" && (
          <div className="selector-row full">

            <div className="selector-item tiny">
              <label>Tour</label>
              <input
                type="checkbox"
                checked={modoTour}
                onChange={(e) => {
                  setModoTour(e.target.checked);
                  setDestinosTour([]);
                }}
              />
            </div>

            <div className="selector-item tiny">
              <label>Sexo</label>
              <select
                className="mini-input"
                value={preferenciaSexo}
                onChange={(e) => setPreferenciaSexo(e.target.value)}
              >
                <option value="cualquiera">Cualquiera</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div className="selector-item tiny">
              <label>Pasaj.</label>
              <select
                className="mini-input"
                value={pasajeros}
                onChange={(e) => setPasajeros(Number(e.target.value))}
              >
                {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>

          </div>
        )}

        {/* MENSAJES SISTEMA */}
        {mensajeSistema && (
          <div className="mensaje-sistema">
            <p>{mensajeSistema}</p>
          </div>
        )}

        {/* INFO PREVIA */}
        {viaje.estado === "pendiente" && viaje.directions && !modoTour && (
          <>
            <div className="trip-miniinfo">
              <p><strong>Distancia:</strong> {viaje.distancia}</p>
              <p><strong>Duración:</strong> {viaje.duracion}</p>
              <p><strong>Tarifa:</strong> ${costo}</p>
            </div>

            <button className="home-button" onClick={solicitarViaje}>
              Solicitar viaje
            </button>
          </>
        )}

        {viaje.estado === "pendiente" && modoTour && viaje.origen && (
          <button className="home-button" onClick={solicitarViaje}>
            Solicitar tour
          </button>
        )}

        {/* BUSCANDO */}
        {viaje.estado === "buscando" && (
          <div>
            <p className="buscando-titulo">Buscando conductores...</p>

            <div className="ofertas-lista compacta">
              {ofertas.map((c) => (
                <div key={c.id} className="oferta-card compacta">
                  <div className="oferta-info">
                    <h3>{c.nombre}</h3>
                    <p>⭐ {c.rating.toFixed(1)}</p>
                    {c.ultimoComentario && (
                      <p className="review-mini">"{c.ultimoComentario}"</p>
                    )}
                    <p className="auto">🚗 {c.modelo}</p>
                  </div>

                  <button
                    className="btn-estado verde"
                    onClick={() => aceptarOferta(c)}
                  >
                    Aceptar
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-estado rojo" onClick={cancelarBusqueda}>
              Cancelar búsqueda
            </button>
          </div>
        )}

        {/* ESPERAS */}
        {viaje.estado === "esperando_conductor" && (
          <div className="viaje-actual">
            <p>Esperando que el conductor confirme...</p>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>
              Cancelar
            </button>
          </div>
        )}

        {viaje.estado === "esperando_confirmacion_pasajero" && (
          <div className="viaje-actual">
            <p>El conductor aceptó. ¿Confirmas?</p>
            <button className="btn-estado verde">Confirmar</button>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>
              Cancelar
            </button>
          </div>
        )}

        {/* CAMINO */}
        {viaje.estado === "conductor_en_camino" && (
          <div className="viaje-actual">
            <p>Tu conductor está en camino...</p>

            {viaje.progreso > 0 && (
              <div className="progreso-barra">
                <div className="progreso-fill" style={{ width: `${viaje.progreso}%` }} />
              </div>
            )}

            {alertaProximidad && (
              <div className="trip-miniinfo">
                <p><strong>🚗 {autoConductor.modelo}</strong></p>
                <p><strong>Color:</strong> {autoConductor.color}</p>
                <p><strong>Placas:</strong> {autoConductor.placas}</p>
                <p className="text-alerta">El conductor está muy cerca</p>
              </div>
            )}
          </div>
        )}

        {/* VIAJE */}
        {viaje.estado === "listo_para_iniciar" && (
          <div className="viaje-actual">
            <p>Sube al vehículo</p>
          </div>
        )}

        {viaje.estado === "viaje_en_progreso" && (
          <div className="viaje-actual">
            <p>En viaje...</p>
            <div className="progreso-barra">
              <div
                className="progreso-fill"
                style={{ width: `${viaje.progreso}%` }}
              />
            </div>
          </div>
        )}

        {/* FINAL */}
        {viaje.estado === "finalizado" && (
          <div className="viaje-actual">
            <p>🚩 Llegaste.</p>
            <button className="btn-estado verde" onClick={resetViaje}>
              Aceptar
            </button>
          </div>
        )}

      </div>

      {/* MODAL REVIEW */}
      {mostrarReview && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Califica tu viaje</h2>

            <label>Calificación:</label>
            <select
              className="map-input"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[1,2,3,4,5].map(n => <option key={n}>{n} estrellas</option>)}
            </select>

            <label>Comentario:</label>
            <textarea
              className="map-input"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />

            <button
              className="btn-estado verde"
              onClick={enviarReview}
            >
              Enviar Reseña
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN EMERGENCIA */}
      <button
        className="btn-estado rojo fab-panic"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          borderRadius: "50%",
          width: 50,
          height: 50,
          fontSize: "1.2rem",
          zIndex: 999
        }}
        onClick={() => {
          socket.emit("pasajero_emergencia", {
            pasajero: localStorage.getItem("userEmail"),
            conductor: viaje.conductor?.email,
            ubicacion: viaje.origen
          });

          resetViaje();
          setMensajeSistema("⚠️ Emergencia enviada");
        }}
      >
        🚨
      </button>

    </div>
  );
}

// ======================================================
// UTILIDAD DISTANCIA
// ======================================================
function toRad(v) { return (v * Math.PI) / 180; }
function distanciaMetros(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
