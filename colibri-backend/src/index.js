import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { execSync } from "child_process";

import authRoutes from "./routes/auth.routes.js";
import tripsRoutes from "./routes/trips.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

// === Rutas REST ===
app.get("/", (_, res) => res.send("API Colibrí ✅"));
app.use("/auth", authRoutes);
app.use("/trips", tripsRoutes);
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// === Migraciones Prisma ===
try {
  console.log("🏗️ Ejecutando migraciones de Prisma...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("✅ Migraciones aplicadas correctamente");
} catch (err) {
  console.error("⚠️ Error al aplicar migraciones:", err.message);
}

// === HTTP + Socket.IO ===
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// === Conductores activos en memoria ===
const conductoresActivos = new Map();

// === Estado temporal de viajes confirmados ===
const viajesActivos = new Map();

// === Conexión de sockets ===
io.on("connection", (socket) => {
  console.log("🟢 Nuevo cliente conectado:", socket.id);

  // === Conductor activo ===
  socket.on("conductor_activo", (data) => {
    conductoresActivos.set(socket.id, data);
    console.log("🚗 Conductor activo:", data);
  });

  // === Pasajero solicita viaje ===
  socket.on("buscar_conductor", (viaje) => {
    console.log("📨 Pasajero solicita viaje:", viaje);

    const lat = Number(viaje.origen.lat);
    const lng = Number(viaje.origen.lng);
    console.log("🧭 Coordenadas pasajero:", lat, lng);

    // Mostrar todos los conductores activos
    console.log("🚗 Conductores activos registrados:");
    for (const [id, c] of conductoresActivos.entries()) {
      console.log(`  → ${c.id}: (${c.lat}, ${c.lng})`);
    }

    // Filtrar conductores cercanos (radio de 5 km)
    const cercanos = Array.from(conductoresActivos.values()).filter((c) => {
      const dist = distancia(Number(c.lat), Number(c.lng), lat, lng);
      console.log(`📏 Distancia con ${c.id}: ${dist.toFixed(2)} km`);
      return dist < 5;
    });

    console.log("📍 Conductores cercanos detectados:", cercanos.length);

    if (cercanos.length > 0) {
      io.to(socket.id).emit("ofertas", cercanos);
      cercanos.forEach((c) => {
        const conductorSocket = [...conductoresActivos.entries()]
          .find(([_, val]) => val.id === c.id)?.[0];
        if (conductorSocket) {
          console.log(`📤 Enviando viaje al conductor ${c.id}`);
          io.to(conductorSocket).emit("nuevo_viaje_disponible", viaje);
        }
      });
    } else {
      console.log("🚫 No hay conductores cercanos al pasajero");
    }
  });

  // === Conductor acepta viaje ===
socket.on("conductor_acepta_viaje", (data) => {
  console.log("✅ Conductor aceptó el viaje:", data);
  const previo = viajesActivos.get(data.pasajero);

  if (previo && previo.pasajeroConfirmado) {
    // 🔹 Ambas partes confirmadas
    const payload = {
      pasajero: data.pasajero,
      conductor: data.conductor,
      origen: data.origen,
      destino: data.destino,
      progreso: 0,
    };

    io.emit("iniciar_recogida", payload);

    // 🔹 Nuevo evento explícito de inicio de viaje
    io.emit("viaje_en_progreso", payload);

    viajesActivos.delete(data.pasajero);
    console.log("🟢 Ambas partes confirmadas (pasajero primero). Viaje iniciado.");
  } else {
    viajesActivos.set(data.pasajero, {
      conductor: data.conductor,
      origen: data.origen,
      conductorConfirmado: true,
    });
    io.emit("viaje_confirmado", data);
    console.log("🕓 Conductor confirmó. Esperando al pasajero...");
  }
});

// === Pasajero confirma asignación ===
socket.on("conductor_asignado", (data) => {
  console.log("🚘 Pasajero confirmó al conductor:", data);
  const previo = viajesActivos.get(data.pasajero);

  if (previo && previo.conductorConfirmado) {
    const payload = {
      pasajero: data.pasajero,
      conductor: previo.conductor,
      origen: data.origen,
      destino: data.destino,
      progreso: 0,
    };

    io.emit("iniciar_recogida", payload);
    io.emit("viaje_en_progreso", payload); // 🔹 aquí también

    viajesActivos.delete(data.pasajero);
    console.log("🟢 Ambas partes confirmadas (conductor primero). Viaje iniciado.");
  } else {
    viajesActivos.set(data.pasajero, {
      pasajeroConfirmado: true,
      ...data,
    });
    console.log("🕓 Pasajero confirmó. Esperando al conductor...");
  }
});

  // === Cancelar confirmación (ambos pueden hacerlo) ===
  socket.on("cancelar_confirmacion", (data) => {
    console.log("❌ Una de las partes canceló la confirmación:", data);
    viajesActivos.delete(data.pasajero);
    io.emit("viaje_cancelado", data);
  });

  // === Conductor desconectado ===
  socket.on("disconnect", () => {
    conductoresActivos.delete(socket.id);
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// === Función utilitaria: distancia entre coordenadas (km) ===
function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// === Iniciar servidor ===
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API + Socket corriendo en http://localhost:${PORT}`);
});
