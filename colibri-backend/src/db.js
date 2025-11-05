import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Verificación inmediata de conexión
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conexión exitosa con Render PostgreSQL");
  } catch (err) {
    console.error("❌ Error de conexión con Render PostgreSQL:", err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
