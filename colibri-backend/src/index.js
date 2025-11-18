import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { execSync } from "child_process";
import historialRoutes from "./routes/historial.js";
import authRoutes from "./routes/auth.routes.js";
import tripsRoutes from "./routes/trips.routes.js";
import validacionRoutes from "./routes/validacion.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
const app = express();
app.use(cors());
app.use(express.json());

// === Rutas REST ===
app.get("/", (_, res) => res.send("API Colibrí ✅"));
app.use("/auth", authRoutes);
app.use("/trips", tripsRoutes);
app.use("/wallet", walletRoutes);
app.use("/validacion", validacionRoutes);
app.use("/historial", historialRoutes);
app.get("/health", (_, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

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

    console.log("🚗 Conductores activos registrados:");
    for (const [id, c] of conductoresActivos.entries()) {
      console.log(`  → ${c.id}: (${c.lat}, ${c.lng})`);
    }

    const todos = Array.from(conductoresActivos.entries());

    if (todos.length === 0) {
      console.log("🚫 No hay conductores activos actualmente.");
      io.to(socket.id).emit("sin_conductores", {
        mensaje: "No hay conductores disponibles por ahora.",
      });
    } else {
      console.log("📢 Enviando solicitud de viaje a todos los conductores activos...");
      todos.forEach(([id, info]) => {
        console.log(`📤 Enviando viaje al conductor ${info.id}`);
        io.to(id).emit("nuevo_viaje_disponible", viaje);
      });

      io.to(socket.id).emit(
        "ofertas",
        todos.map(([_, c]) => ({
          id: c.id,
          nombre: c.nombre,
          lat: c.lat,
          lng: c.lng,
        }))
      );
    }
  });

  // === Conductor acepta viaje ===
  socket.on("conductor_acepta_viaje", (data) => {
    console.log("✅ Conductor aceptó el viaje:", data);
    const previo = viajesActivos.get(data.pasajero);

    if (previo && previo.pasajeroConfirmado) {
      const payload = {
        pasajero: data.pasajero,
        conductor: data.conductor,
        origen: data.origen,
        destino: data.destino,
        progreso: 0,
      };

      io.emit("iniciar_recogida", payload);
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
      io.emit("viaje_en_progreso", payload);

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

  // === Cancelar confirmación ===
  socket.on("cancelar_confirmacion", (data) => {
    console.log("❌ Una de las partes canceló la confirmación:", data);
    viajesActivos.delete(data.pasajero);
    io.emit("viaje_cancelado", data);
  });

  // === Conductor finaliza el viaje ===
  socket.on("viaje_finalizado", async (data) => {
  console.log("🏁 Viaje finalizado:", data);

  const conductorEmail = data.conductor; 
  const costo = Number(data.costo) || 0;
  const comision = costo * 0.15;

  try {
    await prisma.usuario.update({
      where: { email: conductorEmail },
      data: {
        wallet: { increment: comision }
      }
    });

    console.log(`💰 Comisión añadida: ${comision} a ${conductorEmail}`);
  } catch (err) {
    console.error("⚠️ Error al actualizar wallet:", err);
  }

  io.emit("viaje_finalizado", data);
});


  // === Conductor desconectado ===
  socket.on("disconnect", () => {
    conductoresActivos.delete(socket.id);
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});


// === Iniciar servidor ===
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API + Socket corriendo en http://localhost:${PORT}`);
});
