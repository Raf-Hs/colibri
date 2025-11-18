import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/* ============================
   LISTAR CONDUCTORES PENDIENTES
============================ */
router.get("/pendientes", async (req, res) => {
  try {
    const conductores = await prisma.usuario.findMany({
      where: { rol: "conductor", estadoValidacion: "pendiente" },
      select: {
        id: true,
        nombre: true,
        email: true,
        identificacion: true,
        licencia: true,
        poliza: true,
        domicilio: true,
        fotoConductor: true,
        vehiculoFotos: true,
        acreditacionTaxi: true
      },
    });

    res.json(conductores);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error obteniendo pendientes" });
  }
});

/* ============================
        APROBAR CONDUCTOR
============================ */
router.post("/aprobar/:id", async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data: { estadoValidacion: "aprobado" },
    });

    res.json({ message: "Conductor aprobado" });
  } catch (e) {
    res.status(500).json({ message: "Error aprobando conductor" });
  }
});

/* ============================
        RECHAZAR CONDUCTOR
============================ */
router.post("/rechazar/:id", async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data: { estadoValidacion: "rechazado" },
    });

    res.json({ message: "Conductor rechazado" });
  } catch (e) {
    res.status(500).json({ message: "Error rechazando conductor" });
  }
});

export default router;
