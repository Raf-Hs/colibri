function SplashScreen() {
  return (
    <div className="splash-container">
      {/* Ondas de color en cascada - Efecto degradado verde */}
      <div className="wave-overlay">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>

      {/* Círculos decorativos suaves */}
      <div className="splash-circle splash-circle-1"></div>
      <div className="splash-circle splash-circle-2"></div>
      
      {/* Contenido principal centrado */}
      <div className="splash-content">
        {/* Logo animado */}
        <div className="splash-logo-container">
          <div className="splash-emoji">🚗</div>
        </div>

        {/* Nombre de la app */}
        <h1 className="splash-title">Colibrí</h1>
        
        {/* Eslogan */}
        <p className="splash-subtitle">Tu viaje, nuestra prioridad</p>

        {/* Barra de carga */}
        <div className="splash-loading-bar">
          <div className="splash-loading-fill"></div>
        </div>

        {/* Puntos de carga */}
        <div className="splash-dots">
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
        </div>
      </div>

      {/* Versión en la parte inferior */}
      <div className="splash-version">v1.0.0</div>
    </div>
  );
}

export default SplashScreen;