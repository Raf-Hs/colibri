import { useEffect, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "52vh",
  borderRadius: "16px",
};

const fallbackCenter = { lat: 21.3589, lng: -99.6733 };

export default function MapaRutas({ onSelect }) {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(fallbackCenter);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directions, setDirections] = useState(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");

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
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
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
    streetViewControl: false,   // quita pegman
    mapTypeControl: false,      // quita mapa/satélite
    fullscreenControl: false,   // quita fullscreen
    zoomControl: false,
    clickableIcons: false,      // evita íconos innecesarios
    disableDefaultUI: false,    // mantiene los necesarios
    disableDefaultUI: true,
  }}
>

            {origin && <Marker position={origin} label="A" />}
            {destination && <Marker position={destination} label="B" />}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>

          <button className="gps-fab" onClick={usarMiUbicacion}>
            📍
          </button>
        </div>
      </div>
    </LoadScript>
  );
}
