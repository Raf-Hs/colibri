import multer from "multer";
import path from "path";
import { bucket } from "../config/gcs.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default (req, res, next) => {
  const multiUpload = upload.fields([
    { name: "identificacion", maxCount: 1 },
    { name: "licencia", maxCount: 1 },
    { name: "poliza", maxCount: 1 },
    { name: "domicilio", maxCount: 1 },
    { name: "fotoConductor", maxCount: 1 },
    { name: "vehiculoFotos", maxCount: 10 },
    { name: "acreditacionTaxi", maxCount: 1 },
  ]);

  multiUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    req.gcsFiles = {};

    const uploadFile = async (file, key) => {
      const extension = path.extname(file.originalname);
      const blob = bucket.file(
        `conductores/${key}/${Date.now()}_${Math.random().toString(36)}${extension}`
      );
      const stream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype
      });

      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
        stream.end(file.buffer);
      });

      return `gs://${bucket.name}/${blob.name}`;
    };

    // Procesa archivos simples
    const keys = ["identificacion", "licencia", "poliza", "domicilio", "fotoConductor", "acreditacionTaxi"];
    for (const key of keys) {
      if (req.files[key]) {
        req.gcsFiles[key] = await uploadFile(req.files[key][0], key);
      }
    }

    // Procesa múltiples fotos
    if (req.files.vehiculoFotos) {
      req.gcsFiles.vehiculoFotos = [];
      for (const file of req.files.vehiculoFotos) {
        const url = await uploadFile(file, "vehiculoFotos");
        req.gcsFiles.vehiculoFotos.push(url);
      }
    }

    next();
  });
};
