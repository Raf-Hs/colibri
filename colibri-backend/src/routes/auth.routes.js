import { Router } from "express";
import { prisma } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { uploadToGCS } from "../middleware/uploadToGCS.js";
import { bucket } from "../config/gcs.js";
import express from "express";
import uploadConductor from "../middleware/uploadConductorToGCS.js";
import { getSignedUrl } from "../utils/gcsSignedUrl.js";

const router = Router();

// Validación de datos de registro
const registerSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(7),
  password: z.string().min(4),
  rol: z.enum(["viajero", "conductor", "ambos", "validador"]).default("viajero")
});

// Registro normal de usuario
router.post("/register", uploadToGCS, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.usuario.findUnique({ where: { email: data.email }});
    if (exists) return res.status(400).json({ message: "Email ya registrado" });

    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.usuario.create({
  data: {
    ...data,
    password: hash,
    identificacion: req.identificacionURL,
    estadoValidacion: "pendiente"
  }
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

    res.json({
      token,
      rol: user.rol, // 🔹 Enviamos también el rol del usuario
      nombre: user.nombre,
      email: user.email,
      sexo: user.sexo   // ⚡ AGREGADO
    });
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

router.get("/identificacion/:userId", async (req, res) => {
  try {
    const id = Number(req.params.userId);

    const user = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!user || !user.identificacion) {
      return res.status(404).json({ message: "Identificación no encontrada" });
    }

    // user.identificacion = "gs://bucket/identificaciones/ID_xxx.jpg"
    const filePath = user.identificacion.replace(`gs://${bucket.name}/`, "");

    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000 // 5 minutos
    });

    return res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando URL firmada" });
  }
});

router.post("/register-conductor", uploadConductor, async (req, res) => {
  try {
    const data = req.body;

    // Archivos subidos al bucket
    const identificacion = req.gcsFiles.identificacion;
    const licencia = req.gcsFiles.licencia;
    const poliza = req.gcsFiles.poliza;
    const domicilio = req.gcsFiles.domicilio;
    const fotoConductor = req.gcsFiles.fotoConductor;
    const vehiculoFotos = req.gcsFiles.vehiculoFotos || [];
    const acreditacionTaxi = req.gcsFiles.acreditacionTaxi || null;

    const exists = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (exists) return res.status(400).json({ message: "Email ya registrado" });

    const hash = await bcrypt.hash(data.password, 10);

    const user = await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        password: hash,
        rol: "conductor",
        estadoValidacion: "pendiente",
        identificacion,
        licencia,
        poliza,
        domicilio,
        fotoConductor,
        vehiculoFotos,
        acreditacionTaxi
      }
    });

    res.json({ message: "Conductor registrado", id: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registrando el conductor" });
  }
});

// Obtener documentos de un conductor (con URLs firmadas)
router.get("/conductor/:id/documentos", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const user = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        licencia: true,
        poliza: true,
        domicilio: true,
        identificacion: true,
        fotoConductor: true,
        vehiculoFotos: true,
        acreditacionTaxi: true,
        estadoValidacion: true
      }
    });

    if (!user) return res.status(404).json({ message: "Conductor no encontrado" });

    const files = {
      identificacion: user.identificacion,
      licencia: user.licencia,
      poliza: user.poliza,
      domicilio: user.domicilio,
      fotoConductor: user.fotoConductor,
      vehiculoFotos: user.vehiculoFotos,
      acreditacionTaxi: user.acreditacionTaxi,
    };

    // Convertir gs:// a signed URLs
    const signed = {};

    for (const key of Object.keys(files)) {
      const value = files[key];

      if (!value) {
        signed[key] = null;
        continue;
      }

      if (Array.isArray(value)) {
        signed[key] = await Promise.all(
          value.map(async (gsUrl) => await getSignedUrl(gsUrl))
        );
      } else {
        signed[key] = await getSignedUrl(value);
      }
    }

    res.json({
      ...user,
      documentos: signed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo documentos", error: error.message });
  }
});

router.post("/register-validador", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const exists = await prisma.usuario.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: "Email ya registrado" });

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.usuario.create({
      data: {
    nombre,
    email,
    password: hash,
    rol: "validador",
    telefono: "0000000000" // 👈 valor por defecto
  },
});

    res.status(201).json({ message: "Validador creado", id: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando validador" });
  }
});

export default router;
