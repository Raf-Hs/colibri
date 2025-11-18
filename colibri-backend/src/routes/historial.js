import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/* ============================
   GUARDAR VIAJE
============================ */
router.post("/guardar", async (req, res) => {
  try {
    const viaje = req.body;

    const nuevo = await prisma.historial.create({
      data: {
        pasajero: viaje.pasajero,
        conductor: viaje.conductor,
        origen: viaje.origen,          // Json en schema.prisma
        destino: viaje.destino,        // Json en schema.prisma
        distancia: viaje.distancia,
        duracion: viaje.duracion,
        costo: viaje.costo,
        estado: viaje.estado,
        fecha: new Date(),
        origenTexto: viaje.origenTexto || "",
        destinoTexto: viaje.destinoTexto || "",
      },
    });

    res.json({ message: "Viaje guardado correctamente", nuevo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error guardando historial" });
  }
});

/* ============================
   LISTA DE VIAJES (por pasajero)
   GET /historial?pasajero=test@colibri.com
============================ */
/* ============================
      OBTENER HISTORIAL
============================ */
router.get("/:email", async (req, res) => {
  try {
    const historial = await prisma.historial.findMany({
      where: { pasajero: req.params.email },
      orderBy: { id: "desc" }
    });

    res.json(historial);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Error obteniendo historial" });
  }
});

export default router;