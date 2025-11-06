// =======================================
// server.js o donde configures Socket.io
// =======================================
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===== Registro de conductores activos =====
const conductoresActivos = {}; // socket.id -> { id, nombre, lat, lng }

io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // === CONDUCTOR ACTIVO ===
  socket.on("conductor_activo", (data) => {
    conductoresActivos[socket.id] = data;
    console.log(`🚗 Conductor activo: ${data.nombre} (${socket.id})`);
  });

  // === VIAJERO SOLICITA CONDUCTOR ===
  socket.on("buscar_conductor", (viaje) => {
    console.log("📍 Buscando conductores para:", viaje.origen);

    // Envía solo a conductores activos
    Object.entries(conductoresActivos).forEach(([id, info]) => {
      io.to(id).emit("nuevo_viaje", {
        ...viaje,
        timestamp: Date.now()
      });
    });
  });

  // === LIMPIAR CONDUCTOR DESCONECTADO ===
  socket.on("disconnect", () => {
    if (conductoresActivos[socket.id]) {
      console.log("🔴 Conductor desconectado:", conductoresActivos[socket.id].nombre);
      delete conductoresActivos[socket.id];
    } else {
      console.log("⚫ Cliente desconectado:", socket.id);
    }
  });
});

server.listen(3001, () => console.log("✅ Socket.io activo en puerto 3001"));
