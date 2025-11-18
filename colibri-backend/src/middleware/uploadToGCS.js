import multer from "multer";
import { bucket } from "../config/gcs.js";
import path from "path";

const uploadHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  }
}).single("identificacion");

export const uploadToGCS = (req, res, next) => {
  uploadHandler(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    if (!req.file) {
      return res.status(400).json({ message: "Identificación obligatoria" });
    }

    try {
      const blob = bucket.file(
        "identificaciones/" + Date.now() + path.extname(req.file.originalname)
      );

      const stream = blob.createWriteStream({
        resumable: false,
        contentType: req.file.mimetype
      });

      stream.on("error", (error) => {
        console.error(error);
        return res.status(500).json({ message: "Error subiendo imagen" });
      });

      stream.on("finish", async () => {
        req.identificacionURL = `gs://${bucket.name}/${blob.name}`;
        next();
      });

      stream.end(req.file.buffer);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error al subir archivo" });
    }
  });
};
