import HomePasajero from "./HomePasajero";
import HomeConductor from "./HomeConductor";

export default function Home() {
  const rol = localStorage.getItem("rol") || "VIAJERO";
  return rol === "conductor" ? <HomeConductor /> : <HomePasajero />;
}
