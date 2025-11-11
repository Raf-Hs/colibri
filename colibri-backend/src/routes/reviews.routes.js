import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// Crear reseña
const createReviewSchema = z.object({
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
  tipoReseña: z.enum(["pasajero_a_conductor", "conductor_a_pasajero"]),
  viajeId: z.number().int().positive(),
  receptorId: z.number().int().positive(),
});

router.post("/", auth, async (req, res) => {
  try {
    const data = createReviewSchema.parse(req.body);

    // Verificar que el viaje existe y está finalizado
    const viaje = await prisma.viaje.findUnique({
      where: { id: data.viajeId },
    });

    if (!viaje) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    if (viaje.estado !== "FINALIZADO") {
      return res.status(400).json({ 
        message: "Solo puedes reseñar viajes finalizados" 
      });
    }

    // Verificar que no exista ya una reseña del mismo tipo
    const existingReview = await prisma.reseña.findUnique({
      where: {
        viajeId_autorId_tipoReseña: {
          viajeId: data.viajeId,
          autorId: req.user.id,
          tipoReseña: data.tipoReseña,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: "Ya has reseñado este viaje" 
      });
    }

    // Crear la reseña
    const review = await prisma.reseña.create({
      data: {
        calificacion: data.calificacion,
        comentario: data.comentario,
        tipoReseña: data.tipoReseña,
        viajeId: data.viajeId,
        autorId: req.user.id,
        receptorId: data.receptorId,
      },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true },
        },
        receptor: {
          select: { id: true, nombre: true, email: true },
        },
        viaje: {
          select: { id: true, origen: true, destino: true },
        },
      },
    });

    res.status(201).json(review);
  } catch (e) {
    res.status(400).json({ message: "Datos inválidos", error: e?.message });
  }
});

// Obtener reseñas de un usuario (las que ha recibido)
router.get("/usuario/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.reseña.findMany({
      where: { receptorId: Number(id) },
      include: {
        autor: {
          select: { id: true, nombre: true },
        },
        viaje: {
          select: { id: true, origen: true, destino: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calcular promedio
    const promedio = reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.calificacion, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      promedio: promedio.toFixed(1),
      total: reviews.length,
    });
  } catch (e) {
    res.status(500).json({ message: "Error al obtener reseñas", error: e?.message });
  }
});

// Obtener reseñas de un viaje específico
router.get("/viaje/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.reseña.findMany({
      where: { viajeId: Number(id) },
      include: {
        autor: {
          select: { id: true, nombre: true },
        },
        receptor: {
          select: { id: true, nombre: true },
        },
      },
    });

    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: "Error al obtener reseñas del viaje" });
  }
});

// Obtener mis reseñas (las que he dado)
router.get("/mis-reseñas", auth, async (req, res) => {
  try {
    const reviews = await prisma.reseña.findMany({
      where: { autorId: req.user.id },
      include: {
        receptor: {
          select: { id: true, nombre: true },
        },
        viaje: {
          select: { id: true, origen: true, destino: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: "Error al obtener tus reseñas" });
  }
});

export default router;