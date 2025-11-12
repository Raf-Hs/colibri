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

// Conductores activos en memoria
const conductoresActivos = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Nuevo cliente conectado:", socket.id);

  socket.on("conductor_activo", (data) => {
    // data: { id, nombre, lat, lng }
    conductoresActivos.set(socket.id, data);
    console.log("🚗 Conductor activo:", data);
  });

  socket.on("buscar_conductor", (viaje) => {
  console.log("📨 Pasajero solicita viaje:", viaje);

  const lat = Number(viaje.origen.lat);
  const lng = Number(viaje.origen.lng);

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

  socket.on("disconnect", () => {
    conductoresActivos.delete(socket.id);
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🚀 API + Socket corriendo en http://localhost:${PORT}`)
);
