import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoadScript } from "@react-google-maps/api";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Historial from "./pages/Historial";
import SplashScreen from "./pages/SplashScreen";
import Sidebar from "./components/Sidebar";
import "./pages/SplashScreen.css";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <BrowserRouter>
        <Sidebar />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/historial" element={<Historial />} />
        </Routes>
      </BrowserRouter>
    </LoadScript>
  );
}
