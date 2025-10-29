import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

try {
  console.log("🚀 Pasando cambios de main a PROD...");

  execSync("git checkout main && git pull origin main", { stdio: "inherit" });
  execSync("git checkout PROD", { stdio: "inherit" });
  execSync("git merge main", { stdio: "inherit" });
  execSync("git push origin PROD", { stdio: "inherit" });

  // 🔗 Disparar deploy en Render (backend)
  if (process.env.RENDER_DEPLOY_HOOK) {
    console.log("🔗 Disparando deploy en Render (backend)...");
    await axios.post(process.env.RENDER_DEPLOY_HOOK);
    console.log("✅ Backend Colibrí desplegado en Render");
  } else {
    console.log("⚠️ No se encontró RENDER_DEPLOY_HOOK en .env");
  }

  // 🔗 Disparar deploy en Vercel (frontend)
  if (process.env.VERCEL_DEPLOY_HOOK) {
    console.log("🔗 Disparando deploy en Vercel (frontend)...");
    await axios.post(process.env.VERCEL_DEPLOY_HOOK);
    console.log("✅ Frontend Colibrí desplegado en Vercel");
  } else {
    console.log("⚠️ No se encontró VERCEL_DEPLOY_HOOK en .env");
  }

} catch (error) {
  console.error("❌ Error durante el deploy:", error.message);
  process.exit(1);
}
