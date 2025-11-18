import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MapaRutas from "../components/MapaRuta";
import "./Home.css";

const socket = io("https://colibri-backend-od5b.onrender.com");

export default function HomePasajero() {

  /* ============================
     ESTADOS ORIGINALES
  ============================ */
  const [viaje, setViaje] = useState({
    origen: null,
    destino: null,
    distancia: "",
    duracion: "",
    directions: null,
    estado: "pendiente",
    conductor: null,
    rutaConductorPasajero: null,
    progreso: 0,
  });
  const [ofertas, setOfertas] = useState([]);
  const [posicionConductor, setPosicionConductor] = useState(null);
  const [alertaProximidad, setAlertaProximidad] = useState(false);
  const [mensajeSistema, setMensajeSistema] = useState(null);
  const intervaloViaje = useRef(null);

  /* ============================
     NUEVOS ESTADOS
  ============================ */
  const [preferenciaSexo, setPreferenciaSexo] = useState("cualquiera");
  const [pasajeros, setPasajeros] = useState(1);

  const autoConductor = {
    modelo: "Nissan Versa 2020",
    color: "Gris Plata",
    placas: "UAS-342-B",
  };

  const calcularCosto = () => {
    if (!viaje.distancia) return 0;
    const km = parseFloat(viaje.distancia.replace(" km", "").replace(",", "."));
    const base = 25;
    const porKm = 8.5;
    return (base + km * porKm).toFixed(2);
  };
  const costo = calcularCosto();

  const handleSelect = (data) => {
    setViaje((prev) => ({ ...prev, ...data }));
  };

  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /* ============================
     SOCKETS ORIGINALES
  ============================ */
  useEffect(() => {
    console.log("🟢 Socket conectado como pasajero:", localStorage.getItem("userEmail"));

    socket.on("ofertas", (conductores) => {
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

    socket.on("viaje_confirmado", (data) => {
      if (data.pasajero === localStorage.getItem("userEmail")) {
        setViaje((v) => ({
          ...v,
          estado: "esperando_confirmacion_pasajero",
          conductor: data.conductor,
          origen: data.origen,
          destino: data.destino,
        }));
      }
    });

    socket.on("iniciar_recogida", (data) => {
      if (data.pasajero === localStorage.getItem("userEmail")) {
        setViaje((v) => ({
          ...v,
          estado: "conductor_en_camino",
          conductor: data.conductor,
          origen: data.origen,
          destino: data.destino,
        }));
      }
    });

    socket.on("conductor_llego", (data) => {
      if (data.pasajero === localStorage.getItem("userEmail")) {
        setViaje((v) => ({ ...v, estado: "listo_para_iniciar" }));
        setMensajeSistema("El conductor ha llegado al punto de recogida 🚗");
      }
    });

    socket.on("viaje_en_progreso", (data) => {
      if (data.pasajero === localStorage.getItem("userEmail")) {
        setViaje((v) => ({
          ...v,
          estado: "viaje_en_progreso",
          progreso: data.progreso || 0,
        }));
      }
    });

    socket.on("viaje_finalizado", async (data) => {
  const pasajero = localStorage.getItem("userEmail");

  if (data.pasajero === pasajero) {

    // === GUARDAR VIAJE EN EL BACKEND ===
    try {
      await fetch("http://localhost:4000/historial/guardar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + localStorage.getItem("token"),
  },
  body: JSON.stringify({
    pasajero: localStorage.getItem("userEmail"),
    origen: viaje.origenTexto,
    destino: viaje.destinoTexto,
    costo: costo,
    estado: "finalizado",
    conductor: viaje.conductor?.nombre || "desconocido",
    distancia: viaje.distancia,
    duracion: viaje.duracion,
  }),
});
      
      console.log("💾 Viaje guardado correctamente");
    } catch (err) {
      console.error("❌ Error guardando viaje:", err);
    }

    // === CAMBIO DE ESTADO ORIGINAL ===
    setViaje((v) => ({
      ...v,
      estado: "finalizado",
    }));
  }
});

    socket.on("posicion_conductor", (data) => {
      setPosicionConductor(data);

      if (viaje.origen) {
        const dist = calcularDistanciaKm(
          data.lat,
          data.lng,
          viaje.origen.lat,
          viaje.origen.lng
        );

        if (dist <= 1 && !alertaProximidad) {
          setAlertaProximidad(true);
        }
      }
    });

    socket.on("actualizar_ruta_conductor", (data) => {
      const svc = new window.google.maps.DirectionsService();
      svc.route(
        {
          origin: data.conductorPos,
          destination: data.pasajeroPos,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            setViaje((v) => ({ ...v, rutaConductorPasajero: result }));
          }
        }
      );
    });

    return () => {
      socket.off("ofertas");
      socket.off("viaje_confirmado");
      socket.off("iniciar_recogida");
      socket.off("conductor_llego");
      socket.off("viaje_en_progreso");
      socket.off("viaje_finalizado");
      socket.off("posicion_conductor");
      socket.off("actualizar_ruta_conductor");
    };
  }, [viaje.origen, alertaProximidad]);


  /* ============================
     SOLICITAR VIAJE 
     (AQUÍ SE AÑADEN LOS NUEVOS CAMPOS)
  ============================ */
  const solicitarViaje = () => {
    if (!viaje.directions || !viaje.origen || !viaje.destino) return;

    setViaje((v) => ({ ...v, estado: "buscando" }));
    setOfertas([]);

    socket.emit("buscar_conductor", {
      pasajero: localStorage.getItem("userEmail"),
      origen: viaje.origen,
      destino: viaje.destino,
      distancia: viaje.distancia,
      duracion: viaje.duracion,
      costo: costo,
      preferenciaSexo: preferenciaSexo, // 🔥 NUEVO
      pasajeros: pasajeros,            // 🔥 NUEVO
    });
  };

  const cancelarBusqueda = () => {
    setViaje((v) => ({ ...v, estado: "pendiente" }));
    setOfertas([]);

    socket.emit("cancelar_busqueda", {
      pasajero: localStorage.getItem("userEmail"),
    });
  };

  const aceptarOferta = (oferta) => {
    setViaje((v) => ({
      ...v,
      estado: "esperando_conductor",
      conductor: oferta,
    }));
    setOfertas([]);

    socket.emit("conductor_asignado", {
      conductor: oferta,
      pasajero: localStorage.getItem("userEmail"),
      origen: viaje.origen,
      destino: viaje.destino,
    });
  };

  const cancelarConfirmacion = () => {
    socket.emit("cancelar_confirmacion", {
      pasajero: localStorage.getItem("userEmail"),
    });
    setViaje((v) => ({ ...v, estado: "pendiente", conductor: null }));
  };

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Huitzilin</h1>

        {/* === MAPA === */}
        <section className="map-section">
          <MapaRutas
            onSelect={handleSelect}
            permitirRutas={true}
            marcadorConductor={posicionConductor}
            directions={viaje.directions}
            rutaConductorPasajero={viaje.rutaConductorPasajero}
            reset={viaje.estado === "finalizado"}
          />
        </section>

        {/* === SELECTORES NUEVOS === */}
        {viaje.estado === "pendiente" && (
          <div>
            <div className="selector-box" style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, color: "#2B9C93" }}>
                Sexo del conductor:
              </label>
              <select
                className="map-input"
                value={preferenciaSexo}
                onChange={(e) => setPreferenciaSexo(e.target.value)}
              >
                <option value="cualquiera">Cualquiera</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div className="selector-box" style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, color: "#2B9C93" }}>
                Pasajeros:
              </label>
              <select
                className="map-input"
                value={pasajeros}
                onChange={(e) => setPasajeros(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* === MENSAJE DEL SISTEMA === */}
        {mensajeSistema && (
          <div className="mensaje-sistema">
            <p>{mensajeSistema}</p>
          </div>
        )}

        {/* === INFO DE TARIFA === */}
        {viaje.directions && viaje.estado === "pendiente" && (
          <div className="trip-miniinfo">
            <p><strong>Distancia:</strong> {viaje.distancia}</p>
            <p><strong>Duración:</strong> {viaje.duracion}</p>
            <p><strong>Tarifa estimada:</strong> ${costo}</p>
          </div>
        )}

        {viaje.estado === "pendiente" && viaje.directions && (
          <button className="home-button" onClick={solicitarViaje}>
            Solicitar viaje
          </button>
        )}

        {/* === OFERTAS === */}
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
                    <p>⭐ {o.rating} · {o.tiempo}</p>
                    <p className="auto">🚗 {o.modelo}</p>
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

        {/* === ESTADOS ORIGINALES === */}
        {viaje.estado === "esperando_conductor" && (
          <div className="viaje-actual">
            <p>Esperando confirmación del conductor...</p>
            <button className="btn-estado rojo" onClick={cancelarConfirmacion}>
              Cancelar viaje
            </button>
          </div>
        )}

        {viaje.estado === "esperando_confirmacion_pasajero" && (
          <div className="viaje-actual">
            <p>El conductor aceptó tu viaje. ¿Deseas confirmar?</p>
            <div className="acciones">
              <button
                className="btn-estado verde"
                onClick={() => aceptarOferta(viaje.conductor)}
              >
                Confirmar
              </button>
              <button
                className="btn-estado rojo"
                onClick={cancelarConfirmacion}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {viaje.estado === "conductor_en_camino" && (
          <div className="viaje-actual">
            <p>Tu conductor está en camino...</p>

            {alertaProximidad && (
              <div className="trip-miniinfo">
                <p><strong>🚗 {autoConductor.modelo}</strong></p>
                <p><strong>Color:</strong> {autoConductor.color}</p>
                <p><strong>Placas:</strong> {autoConductor.placas}</p>
                <p className="text-alerta">
                  Tu conductor está a menos de 1 km de distancia
                </p>
              </div>
            )}
          </div>
        )}

        {viaje.estado === "viaje_en_progreso" && (
          <div className="viaje-actual">
            <p>Viajando hacia tu destino...</p>
            <div className="progreso-barra">
              <div
                className="progreso-fill"
                style={{ width: `${viaje.progreso || 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {viaje.estado === "finalizado" && (
          <div className="viaje-actual">
            <p>🚩 Has llegado a tu destino.</p>

            <button
              className="btn-estado verde"
              onClick={() => {
                setViaje({
                  origen: null,
                  destino: null,
                  distancia: "",
                  duracion: "",
                  directions: null,
                  estado: "pendiente",
                  conductor: null,
                  rutaConductorPasajero: null,
                  progreso: 0,
                });
                setMensajeSistema(null);
                setOfertas([]);
                setPosicionConductor(null);
                setAlertaProximidad(false);
              }}
            >
              Aceptar
            </button>
          </div>
        )}

      </div>

      {/* === BOTÓN DE EMERGENCIA === */}
      <button
        className="btn-estado rojo"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          fontSize: "1.4rem",
          zIndex: 999,
        }}
        onClick={() => {
          console.log("🚨 EMERGENCIA REPORTADA");
          socket.emit("pasajero_emergencia", {
            pasajero: localStorage.getItem("userEmail"),
            ubicacion: viaje.origen || null,
          });
          alert("Emergencia reportada");
        }}
      >
        🚨
      </button>

    </div>
  );
}
