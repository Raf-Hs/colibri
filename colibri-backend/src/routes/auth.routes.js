import { Router } from "express";
import { prisma } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const router = Router();

// Validación de datos de registro
const registerSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(7),
  password: z.string().min(4),
  rol: z.enum(["viajero", "conductor", "ambos"]).default("viajero")
});

// Registro normal de usuario
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.usuario.findUnique({ where: { email: data.email }});
    if (exists) return res.status(400).json({ message: "Email ya registrado" });

    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.usuario.create({
      data: { ...data, password: hash }
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Datos inválidos", error: e?.message });
  }
});

// Validación de login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

// Login normal + verificación 2FA posterior
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    // Si el usuario tiene 2FA activo, no se genera el token aún
    if (user.secret2FA) {
      return res.json({
        require2FA: true,
        email: user.email,
        message: "Se requiere código 2FA"
      });
    }

    // Si no tiene 2FA, genera token directo
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Datos inválidos", error: e?.message });
  }
});

// Obtener usuarios
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});


//NUEVO: Generar secreto y QR para configurar Google Authenticator
router.get("/generate-2fa/:email", async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({ where: { email: req.params.email } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Generar secreto único
    const secret = speakeasy.generateSecret({
      name: `Huitzilin (${req.params.email})`,
      length: 20
    });

    // Guardar clave secreta asociada al usuario
    await prisma.usuario.update({
      where: { email: req.params.email },
      data: { secret2FA: secret.base32 }
    });

    // Generar código QR
    const qr = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qr,
      secret: secret.base32,
      message: "Escanea el código QR con Google Authenticator o Authy"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando QR", error: error.message });
  }
});

// NUEVO: Verificar código 2FA y emitir token
router.post("/verify-2fa", async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.secret2FA)
      return res.status(400).json({ message: "2FA no configurado" });

    const verified = speakeasy.totp.verify({
      secret: user.secret2FA,
      encoding: "base32",
      token,
      window: 1
    });

    if (!verified)
      return res.status(401).json({ message: "Código inválido o expirado" });

    // Generar token JWT real si el código es correcto
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.json({ verified: true, token: jwtToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error verificando código", error: error.message });
  }
});

export default router;
