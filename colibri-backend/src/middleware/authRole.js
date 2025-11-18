import jwt from "jsonwebtoken";

export function auth(roleRequired) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Token faltante" });

    const token = header.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (roleRequired && decoded.rol !== roleRequired) {
        return res.status(403).json({ message: "Acceso denegado" });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: "Token inválido" });
    }
  };
}
