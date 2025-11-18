import HomePasajero from "./HomePasajero";
import HomeConductor from "./HomeConductor";
import ValidacionPanel from "./ValidadorPanel";

export default function Home() {
  const rol = localStorage.getItem("rol") || "viajero";

  if (rol === "conductor") return <HomeConductor />;
  if (rol === "validador") return <ValidacionPanel />;

  return <HomePasajero />;
}
