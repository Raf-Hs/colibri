import { useEffect, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "52vh",
  borderRadius: "16px",
};

const fallbackCenter = { lat: 21.3589, lng: -99.6733 };

// 🔹 Anti-spam geocoder lock
let geocodeLock = false;

async function geocodeOnce(location) {
  if (geocodeLock) return null; // No repetir
  geocodeLock = true;

  const geocoder = new window.google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location }, (results, status) => {
      if (status === "OK" && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        resolve(null);
      }

      // Cooldown ultra corto
      setTimeout(() => {
        geocodeLock = false;
      }, 300); // 300ms → imposible spamear la API
    });
  });
}

export default function MapaRutas({
  onSelect,
  marcadorConductor,
  directions,
  rutaConductorPasajero,
  permitirRutas = true,
  reset = false,
}) {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(fallbackCenter);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directionsLocal, setDirectionsLocal] = useState(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  // === UBICACIÓN INICIAL SIN GEOCODING ===
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
  }, []); // Solo 1 vez

  // === CLICK EN EL MAPA (ÚNICO LUGAR donde se usa Geocoder) ===
  const handleClick = async (e) => {
    if (!permitirRutas) return;

    const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    // Geocoding seguro, con anti-spam
    const direccion =
      (await geocodeOnce(clicked)) ||
      `${clicked.lat.toFixed(6)}, ${clicked.lng.toFixed(6)}`;

    // Primera selección: origen
    if (!origin) {
      setOrigin(clicked);
      setOriginText(direccion);
      setDestination(null);
      setDirectionsLocal(null);
      onSelect?.({ origen: clicked, origenTexto: direccion });
      return;
    }

    // Segunda selección: destino
    if (!destination) {
      setDestination(clicked);
      setDestinationText(direccion);
      calcularRuta(clicked);
      onSelect?.({ destino: clicked, destinoTexto: direccion });
      return;
    }

    // Si ya había origen y destino → reiniciar origen
    setOrigin(clicked);
    setOriginText(direccion);
    setDestination(null);
    setDestinationText("");
    setDirectionsLocal(null);
    onSelect?.({ origen: clicked, origenTexto: direccion });
  };

  // === CALCULAR RUTA ===
  const calcularRuta = (dest) => {
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (res, status) => {
        if (status === "OK") {
          setDirectionsLocal(res);
          const leg = res.routes[0].legs[0];
          onSelect?.({
            directions: res,
            distancia: leg.distance.text,
            duracion: leg.duration.text,
          });
          if (map && res.routes[0].bounds) map.fitBounds(res.routes[0].bounds);
        }
      }
    );
  };

  // === RUTA SECUNDARIA: conductor → pasajero ===
  useEffect(() => {
    if (!map || !rutaConductorPasajero) return;

    const renderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#1E88E5",
        strokeOpacity: 0.7,
        strokeWeight: 4,
      },
    });

    renderer.setDirections(rutaConductorPasajero);

    return () => renderer.setMap(null);
  }, [map, rutaConductorPasajero]);

  // === RESET DEL MAPA ===
  useEffect(() => {
    if (reset) {
      setOrigin(null);
      setDestination(null);
      setDirectionsLocal(null);
      setOriginText("");
      setDestinationText("");
      setCenter(fallbackCenter);
      if (map) map.panTo(fallbackCenter);
    }
  }, [reset, map]);

  // === GPS FAB (sin geocoding) ===
  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setOrigin(loc);
        setOriginText("Mi ubicación actual");
        onSelect?.({ origen: loc });
        if (map) map.panTo(loc);
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
          {!directions && origin && <Marker position={origin} label="A" />}
          {!directions && destination && <Marker position={destination} label="B" />}

          {(directions || directionsLocal) && (
            <DirectionsRenderer directions={directions || directionsLocal} />
          )}

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
