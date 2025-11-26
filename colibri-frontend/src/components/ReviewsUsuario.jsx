import { useEffect, useState } from "react";

export default function ReviewsUsuario({ email, onClose }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:4000/reviews/usuario/${email}`)
      .then(res => res.json())
      .then(data => setReviews(data))
      .catch(err => console.error(err));
  }, [email]);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Reseñas del conductor</h2>

        {reviews.length === 0 && <p>Este usuario aún no tiene reseñas.</p>}

        {reviews.map((r) => (
          <div key={r.id} className="review-card">
            <p><strong>{r.autor.nombre}</strong> ({r.autor.email})</p>
            <p>⭐ {r.rating}/5</p>
            {r.comentario && <p>{r.comentario}</p>}
            <hr />
          </div>
        ))}

        <button className="btn-estado rojo" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
