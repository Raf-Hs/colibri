import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

/* ============================
   OBTENER WALLET DE CONDUCTOR
============================ */
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { wallet: true }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ balance: user.wallet });
  } catch (e) {
    console.error("Error obteniendo wallet:", e);
    res.status(500).json({ message: "Error obteniendo wallet" });
  }
});

/* ============================
   SUMAR COMISIÓN AL WALLET
============================ */
router.post("/sumar/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { monto } = req.body;

    if (monto === undefined) {
      return res.status(400).json({ message: "Monto requerido" });
    }

    const user = await prisma.usuario.update({
      where: { email },
      data: {
        wallet: {
          increment: Number(monto)
        }
      },
      select: { wallet: true }
    });

    res.json({ balance: user.wallet });
  } catch (e) {
    console.error("Error sumando al wallet:", e);
    res.status(500).json({ message: "Error sumando al wallet" });
  }
});

/* ============================
   RESETEAR WALLET TRAS PAGAR
============================ */
router.post("/reset/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.usuario.update({
      where: { email },
      data: { wallet: 0 },
      select: { wallet: true }
    });

    res.json({ balance: user.wallet });
  } catch (e) {
    console.error("Error reseteando wallet:", e);
    res.status(500).json({ message: "Error reseteando wallet" });
  }
});

export default router;
