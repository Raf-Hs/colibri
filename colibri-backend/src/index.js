import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import tripsRoutes from "./routes/trips.routes.js";
import { execSync } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send("API Colibrí ✅"));
app.use("/auth", authRoutes);
app.use("/trips", tripsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

try {
  console.log("🏗️ Ejecutando migraciones de Prisma...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("✅ Migraciones aplicadas correctamente");
} catch (err) {
  console.error("⚠️ Error al aplicar migraciones:", err.message);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API corriendo en http://localhost:${PORT}`));
