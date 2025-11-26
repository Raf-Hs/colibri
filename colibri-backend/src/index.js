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
import reviewsRoutes from "./routes/reviews.routes.js";
import { prisma } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Rutas REST
app.get("/", (_, res) => res.send("API Colibrí ✅"));
app.use("/auth", authRoutes);
app.use("/trips", tripsRoutes);
app.use("/wallet", walletRoutes);
app.use("/validacion", validacionRoutes);
app.use("/historial", historialRoutes);
app.use("/reviews", reviewsRoutes);

app.get("/health", (_, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// Migraciones Prisma
try {
  console.log("🏗️ Ejecutando migraciones de Prisma...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("✅ Migraciones aplicadas correctamente");
} catch (err) {
  console.error("⚠️ Error al aplicar migraciones:", err.message);
}

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// MAPAS EN MEMORIA
const conductoresActivos = new Map();   // socketId → info conductor
const viajesActivos = new Map();        // pasajero → estado del viaje

// =========================================================
//              SOCKET.IO PRINCIPAL
// =========================================================
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // ======================================================
  // 🟦 1. CONDUCTOR ACTIVO
  // ======================================================
  socket.on("conductor_activo", (data) => {
    conductoresActivos.set(socket.id, {
      socketId: socket.id,
      email: data.email,
      nombre: data.nombre,
      lat: data.lat,
      lng: data.lng,
      capacidad: data.capacidad || 4,
      sexo: data.sexo || "hombre",
    });

    console.log("🚗 Conductor activo:", conductoresActivos.get(socket.id));
  });

  // ======================================================
  // 🟨 2. PASAJERO SOLICITA VIAJE
  // ======================================================
  socket.on("buscar_conductor", (viaje) => {
    console.log("📨 Solicitud de viaje:", viaje);

    const lista = Array.from(conductoresActivos.entries());

    // capacidad
    const filtrados = lista.filter(([_, c]) => c.capacidad >= viaje.pasajeros);

    // sexo
    let filtradosSexo = filtrados;
    if (viaje.preferenciaSexo === "mujer")
      filtradosSexo = filtrados.filter(([_, c]) => c.sexo === "mujer");

    if (viaje.preferenciaSexo === "hombre")
      filtradosSexo = filtrados.filter(([_, c]) => c.sexo === "hombre");

    if (filtradosSexo.length === 0) {
      io.to(socket.id).emit("sin_conductores", {
        mensaje: "No hay conductores disponibles según tu preferencia",
      });
      return;
    }

    // notificar a los conductores filtrados
    filtradosSexo.forEach(([idSocket, info]) => {
      io.to(idSocket).emit("nuevo_viaje_disponible", viaje);
    });

    io.to(socket.id).emit(
      "ofertas",
      filtradosSexo.map(([_, c]) => ({
        id: c.email,
        nombre: c.nombre,
        email: c.email,
        lat: c.lat,
        lng: c.lng,
      }))
    );
  });

  // ======================================================
  // 🟩 3. CONDUCTOR ACEPTA
  // ======================================================
  socket.on("conductor_acepta_viaje", (data) => {
    const previo = viajesActivos.get(data.pasajero);

    // guardar relación pasajero → conductor
    viajesActivos.set(data.pasajero, {
      ...previo,
      conductorConfirmado: true,
      conductor: data.conductor,
      origen: data.origen,
      destino: data.destino,
    });

    if (previo?.pasajeroConfirmado) {
      const payload = {
        pasajero: data.pasajero,
        conductor: data.conductor,
        origen: data.origen,
        destino: data.destino,
        progreso: 0,
      };

      io.emit("iniciar_recogida", payload);
      viajesActivos.delete(data.pasajero);
    } else {
      io.emit("viaje_confirmado", data);
    }
  });

  // ======================================================
  // 🟧 4. PASAJERO CONFIRMA
  // ======================================================
  socket.on("conductor_asignado", (data) => {
    const previo = viajesActivos.get(data.pasajero);

    viajesActivos.set(data.pasajero, {
      ...previo,
      pasajeroConfirmado: true,
      pasajero: data.pasajero,
      origen: data.origen,
      destino: data.destino,
      conductor: previo?.conductor || data.conductor,
    });

    if (previo?.conductorConfirmado) {
      const payload = {
        pasajero: data.pasajero,
        conductor: previo.conductor,
        origen: data.origen,
        destino: data.destino,
        progreso: 0,
      };

      io.emit("iniciar_recogida", payload);
      viajesActivos.delete(data.pasajero);
    }
  });

  // ======================================================
  // ❌ 5. CANCELAR CONFIRMACIÓN
  // ======================================================
  socket.on("cancelar_confirmacion", (data) => {
    viajesActivos.delete(data.pasajero);
    io.emit("viaje_cancelado", data);
  });

  // ======================================================
  // 🏁 6. VIAJE FINALIZADO
  // ======================================================
  socket.on("viaje_finalizado", async (data) => {
    const conductorEmail = data.conductor;
    const costo = Number(data.costo) || 0;
    const comision = costo * 0.15;

    try {
      await prisma.usuario.update({
        where: { email: conductorEmail },
        data: { wallet: { increment: comision } },
      });

      console.log(`💰 Comisión añadida: ${comision}`);
    } catch (err) {
      console.error("⚠️ Error wallet:", err);
    }

    io.emit("viaje_finalizado", data);
  });

  // ======================================================
  // 📍 7. POSICIÓN DEL CONDUCTOR (GPS REAL)
  // ======================================================
  socket.on("posicion_conductor", (data) => {
  const { pasajero, lat, lng, progreso } = data;

  let pasajeroSocketId = null;
  for (const [id, s] of io.sockets.sockets) {
    if (s.handshake.auth?.email === pasajero) {
      pasajeroSocketId = id;
      break;
    }
  }

  if (!pasajeroSocketId) return;

  io.to(pasajeroSocketId).emit("posicion_conductor", {
    lat,
    lng,
    // si viene definido desde el conductor, se reenvía;
    // si no, simplemente no se usa en el pasajero
    progreso,
  });
});

  // ======================================================
  // 🚨 8. BOTÓN DE EMERGENCIA
  // ======================================================
  socket.on("pasajero_emergencia", (data) => {
    const { pasajero, conductor } = data;

    let conductorSocketId = null;
    for (const [id, info] of conductoresActivos.entries()) {
      if (info.email === conductor) {
        conductorSocketId = id;
        break;
      }
    }

    if (conductorSocketId) {
      io.to(conductorSocketId).emit("alerta_emergencia", {
        mensaje: "El pasajero reportó una emergencia",
        pasajero,
      });
      io.to(conductorSocketId).emit("viaje_cancelado_emergencia");
    }

    io.to(socket.id).emit("alerta_emergencia", {
      mensaje: "Emergencia enviada. Viaje cancelado",
      pasajero,
    });

    io.to(socket.id).emit("viaje_cancelado_emergencia");
  });

  // ======================================================
  // 🔴 9. DESCONECTADO
  // ======================================================
  socket.on("disconnect", () => {
    conductoresActivos.delete(socket.id);
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// =========================================================
// INICIAR SERVIDOR
// =========================================================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API + Socket corriendo en http://localhost:${PORT}`);
});
