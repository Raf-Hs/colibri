function SplashScreen() {
  return (
    <div className="splash-container">
      <div className="wave-overlay">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>
      
      <div className="splash-content">
        <div className="splash-logo-container">
          <img 
            src="https://i.imgur.com/tDiPuet.png" 
            alt="Huitzilin Logo" 
            className="splash-logo"
          />
        </div>

        <h1 className="splash-title">Huitzilin</h1>
        
        <p className="splash-subtitle">Tu viaje, nuestra prioridad</p>

        <div className="splash-loading-bar">
          <div className="splash-loading-fill"></div>
        </div>

      </div>

      <div className="splash-version">v1.0.0</div>
    </div>
  );
}

export default SplashScreen;