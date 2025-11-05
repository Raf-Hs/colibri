import { useEffect, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "52vh",
  borderRadius: "16px",
};

const fallbackCenter = { lat: 21.3589, lng: -99.6733 };

export default function MapaRutas({ onSelect, marcadorConductor }) {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(fallbackCenter);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directions, setDirections] = useState(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  // === UBICACIÓN INICIAL ===
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          setOrigin(loc);
          setOriginText("Mi ubicación actual");
          onSelect?.({ origen: loc });
        },
        () => setCenter(fallbackCenter),
        { enableHighAccuracy: true }
      );
    }
  }, [onSelect]);

  // === CLICK EN EL MAPA ===
  const handleClick = (e) => {
    const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (!origin) {
      setOrigin(clicked);
      setOriginText(`${clicked.lat.toFixed(6)}, ${clicked.lng.toFixed(6)}`);
      setDestination(null);
      setDirections(null);
      onSelect?.({ origen: clicked });
    } else if (!destination) {
      setDestination(clicked);
      setDestinationText(`${clicked.lat.toFixed(6)}, ${clicked.lng.toFixed(6)}`);
      onSelect?.({ destino: clicked });
      calcularRuta(origin, clicked);
    } else {
      setOrigin(clicked);
      setOriginText(`${clicked.lat.toFixed(6)}, ${clicked.lng.toFixed(6)}`);
      setDestination(null);
      setDestinationText("");
      setDirections(null);
      onSelect?.({ origen: clicked, destino: null });
    }
  };

  // === CALCULAR RUTA ===
  const calcularRuta = (orig, dest) => {
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin: orig,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (res, status) => {
        if (status === "OK") {
          setDirections(res);
          const leg = res.routes[0].legs[0];
          onSelect?.({
            directions: res,
            distancia: leg.distance.text,
            duracion: leg.duration.text,
          });
          if (map && res.routes[0].bounds) map.fitBounds(res.routes[0].bounds);
        } else {
          console.error("Error al calcular la ruta:", status);
        }
      }
    );
  };

  // === UBICACIÓN ACTUAL ===
  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setOrigin(loc);
        setOriginText("Mi ubicación actual");
        if (map) map.panTo(loc);
        onSelect?.({ origen: loc });
      },
      (e) => console.warn("GPS error:", e),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="map-wrapper">
      <div className="inputs-mapa">
        <input
          type="text"
          placeholder="📍 Lugar de salida"
          className="map-input"
          value={originText}
          onChange={(e) => setOriginText(e.target.value)}
        />
        <input
          type="text"
          placeholder="🏁 Destino"
          className="map-input"
          value={destinationText}
          onChange={(e) => setDestinationText(e.target.value)}
        />
      </div>

      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          onClick={handleClick}
          onLoad={(m) => setMap(m)}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: false,
            clickableIcons: false,
            disableDefaultUI: true,
          }}
        >
          {/* Marcadores de origen y destino (solo si no hay ruta trazada) */}
          {!directions && origin && <Marker position={origin} label="A" />}
          {!directions && destination && <Marker position={destination} label="B" />}

          {/* Render de la ruta */}
          {directions && <DirectionsRenderer directions={directions} />}

          {/* 🔹 Marcador del conductor en movimiento */}
          {marcadorConductor && (
            <Marker
              position={marcadorConductor}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#28a745",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
              }}
            />
          )}

          {/* 🔵 Marcador del usuario (GPS actual) */}
          {origin && (
            <Marker
              position={origin}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
              }}
            />
          )}
        </GoogleMap>

        <button className="gps-fab" onClick={usarMiUbicacion}>
          📍
        </button>
      </div>
    </div>
  );
}
