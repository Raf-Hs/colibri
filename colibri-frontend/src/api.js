const API_URL = "https://colibri-backend.onrender.com"; // 👈 tu backend en Render

export async function apiRegister(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiLogin(data) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiGetTrips(token) {
  const res = await fetch(`${API_URL}/trips`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function apiCreateTrip(data, token) {
  const res = await fetch(`${API_URL}/trips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiUpdateTripEstado(id, token) {
  const res = await fetch(`${API_URL}/trips/${id}/estado`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function apiCancelTrip(id, token) {
  const res = await fetch(`${API_URL}/trips/${id}/cancelar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function apiRateTrip(id, calificacion, token) {
  const res = await fetch(`${API_URL}/trips/${id}/calificar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ calificacion }),
  });
  return res.json();
}

export async function apiCreateReview(data, token) {
  const res = await fetch(`${API_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiGetUserReviews(userId) {
  const res = await fetch(`${API_URL}/reviews/usuario/${userId}`);
  return res.json();
}

export async function apiGetTripReviews(tripId, token) {
  const res = await fetch(`${API_URL}/reviews/viaje/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function apiGetMyReviews(token) {
  const res = await fetch(`${API_URL}/reviews/mis-reseñas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}