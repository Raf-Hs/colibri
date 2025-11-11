import { useState, useEffect } from "react";
import { apiGetMyReviews, apiCreateReview, apiGetTrips } from "../api";
import "./Reseñas.css";

export default function Reseñas() {
  const [activeTab, setActiveTab] = useState("recibidas");
  const [myReviews, setMyReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar mis reseñas (las que he dado)
      const myReviewsData = await apiGetMyReviews(token);
      setMyReviews(myReviewsData);

      // Cargar viajes para encontrar los pendientes de reseñar
      const trips = await apiGetTrips(token);
      const finalized = trips.filter(t => t.estado === "FINALIZADO");
      
      // Filtrar viajes que aún no tienen reseña
      const pending = finalized.filter(trip => {
        return !myReviewsData.some(review => review.viajeId === trip.id);
      });
      
      setPendingTrips(pending);

      // Para las reseñas recibidas, usaremos localStorage temporalmente
      // (en producción deberías obtenerlas del backend con el ID del usuario)
      const storedReceivedReviews = JSON.parse(
        localStorage.getItem("receivedReviews") || "[]"
      );
      setReceivedReviews(storedReceivedReviews);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar las reseñas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (trip) => {
    setSelectedTrip(trip);
    setRating(0);
    setComment("");
    setShowModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Por favor selecciona una calificación");
      return;
    }

    try {
      const reviewData = {
        calificacion: rating,
        comentario: comment || undefined,
        tipoReseña: "pasajero_a_conductor",
        viajeId: selectedTrip.id,
        receptorId: selectedTrip.usuarioId || 1, // En producción, obtener del backend
      };

      await apiCreateReview(reviewData, token);
      
      alert("✅ Reseña enviada correctamente");
      setShowModal(false);
      loadData(); // Recargar datos
    } catch (error) {
      console.error("Error al crear reseña:", error);
      alert("❌ Error al enviar la reseña");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderStars = (count) => {
    return "⭐".repeat(count);
  };

  const calculateAverage = (reviews) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.calificacion, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="reviews-container">
        <div className="reviews-box">
          <p className="empty-message">Cargando reseñas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-container">
      <div className="reviews-box">
        <h1 className="reviews-title">⭐ Reseñas</h1>

        {/* Estadísticas */}
        <div className="review-stats">
          <h3>Tu calificación promedio</h3>
          <div className="big-number">
            {calculateAverage(receivedReviews)} ⭐
          </div>
          <div className="small-text">
            Basado en {receivedReviews.length} reseña{receivedReviews.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Viajes pendientes de reseñar */}
        {pendingTrips.length > 0 && (
          <div className="pending-reviews">
            <h2 className="pending-title">📝 Viajes pendientes de reseñar</h2>
            {pendingTrips.map((trip) => (
              <div key={trip.id} className="pending-trip">
                <div className="pending-trip-info">
                  <p><strong>De:</strong> {trip.origen}</p>
                  <p><strong>A:</strong> {trip.destino}</p>
                  <p><strong>Conductor:</strong> {trip.conductor}</p>
                  <p><strong>Fecha:</strong> {formatDate(trip.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleOpenModal(trip)}
                  className="btn-review"
                >
                  Calificar viaje
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="reviews-tabs">
          <button
            className={`tab-button ${activeTab === "recibidas" ? "active" : ""}`}
            onClick={() => setActiveTab("recibidas")}
          >
            Recibidas ({receivedReviews.length})
          </button>
          <button
            className={`tab-button ${activeTab === "dadas" ? "active" : ""}`}
            onClick={() => setActiveTab("dadas")}
          >
            Dadas ({myReviews.length})
          </button>
        </div>

        {/* Contenido de tabs */}
        <div className="reviews-list">
          {activeTab === "recibidas" ? (
            receivedReviews.length > 0 ? (
              receivedReviews.map((review) => (
                <div key={review.id} className="review-card">
                  <span className={`review-type-badge ${review.tipoReseña === "pasajero_a_conductor" ? "pasajero" : "conductor"}`}>
                    {review.tipoReseña === "pasajero_a_conductor" ? "👤 Pasajero" : "🚗 Conductor"}
                  </span>
                  <div className="review-header">
                    <span className="review-author">{review.autor?.nombre || "Usuario"}</span>
                    <span className="review-stars">{renderStars(review.calificacion)}</span>
                  </div>
                  <p className="review-trip-info">
                    📍 {review.viaje?.origen} → {review.viaje?.destino}
                  </p>
                  {review.comentario && (
                    <p className="review-comment">"{review.comentario}"</p>
                  )}
                  <p className="review-date">{formatDate(review.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="empty-message">
                <span className="emoji">📭</span>
                Aún no has recibido reseñas
              </p>
            )
          ) : (
            myReviews.length > 0 ? (
              myReviews.map((review) => (
                <div key={review.id} className="review-card">
                  <span className={`review-type-badge ${review.tipoReseña === "pasajero_a_conductor" ? "pasajero" : "conductor"}`}>
                    {review.tipoReseña === "pasajero_a_conductor" ? "👤 A Conductor" : "🚗 A Pasajero"}
                  </span>
                  <div className="review-header">
                    <span className="review-author">Para: {review.receptor?.nombre || "Usuario"}</span>
                    <span className="review-stars">{renderStars(review.calificacion)}</span>
                  </div>
                  <p className="review-trip-info">
                    📍 {review.viaje?.origen} → {review.viaje?.destino}
                  </p>
                  {review.comentario && (
                    <p className="review-comment">"{review.comentario}"</p>
                  )}
                  <p className="review-date">{formatDate(review.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="empty-message">
                <span className="emoji">✍️</span>
                Aún no has dado reseñas
              </p>
            )
          )}
        </div>
      </div>

      {/* Modal para crear reseña */}
      {showModal && (
        <div className="review-modal" onClick={() => setShowModal(false)}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="review-modal-title">Calificar viaje</h2>
            
            <div className="review-trip-info" style={{ marginBottom: "1rem" }}>
              <p><strong>De:</strong> {selectedTrip.origen}</p>
              <p><strong>A:</strong> {selectedTrip.destino}</p>
              <p><strong>Conductor:</strong> {selectedTrip.conductor}</p>
            </div>

            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="form-group">
                <label>Calificación</label>
                <div className="stars-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${rating >= star ? "active" : ""}`}
                      onClick={() => setRating(star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Comentario (opcional)</label>
                <textarea
                  className="review-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia con este viaje..."
                  maxLength={500}
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn-submit">
                  Enviar reseña
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}