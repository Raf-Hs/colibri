import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.post("/crear", async (req, res) => {
  try {
    const { autorId, destinoId, viajeId, rating, comentario } = req.body;

    const review = await prisma.review.create({
      data: { autorId, destinoId, viajeId, rating, comentario }
    });

    res.json({ message: "Review registrada", review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar review" });
  }
});

router.get("/usuario/:id", async (req, res) => {
  try {
    const destinoId = Number(req.params.id);

    const reviews = await prisma.review.findMany({
      where: { destinoId },
      include: {
        autor: { select: { nombre: true, email: true } }
      }
    });

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener reviews" });
  }
});

export default router;
