import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// === Variables globales ===
const BASE_URL = __ENV.BASE_URL || 'https://colibri-backend-od5b.onrender.com';
const USER = __ENV.USER || 'test@colibri.com';
const PASS = __ENV.PASS || '1234';

// === Métricas personalizadas ===
export const t_login = new Trend('login_duration');
export const t_trips = new Trend('trips_duration');
export const t_create = new Trend('create_trip_duration');
export const errors = new Rate('errors');

// === Configuración de la prueba ===
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // rampa inicial
    { duration: '1m', target: 20 },   // carga media
    { duration: '30s', target: 0 },   // descenso
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],    // menos del 2% de errores
    http_req_duration: ['p(95)<3000'], // 95% de peticiones bajo 3s
    checks: ['rate>0.99'],             // 99% de validaciones exitosas
  },
};

// === Función auxiliar para encabezados ===
function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// === Escenario principal ===
export default function () {
  let token = '';

  // 1️⃣ Verificar disponibilidad del backend
  group('GET /health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'status 200 en /health': (r) => r.status === 200,
      'respuesta contiene ok': (r) => r.json('status') === 'ok',
    });
    sleep(0.5);
  });

  // 2️⃣ Login de usuario
  group('POST /auth/login', () => {
    const payload = JSON.stringify({ email: USER, password: PASS });
    const res = http.post(`${BASE_URL}/auth/login`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    t_login.add(res.timings.duration);
    const ok = check(res, {
      'status 200 en login': (r) => r.status === 200,
      'token devuelto': (r) => r.json('token') !== undefined,
    });
    if (!ok) errors.add(1);
    token = res.json('token');
    sleep(1);
  });

  // 3️⃣ Consultar viajes del usuario
  group('GET /trips', () => {
    const res = http.get(`${BASE_URL}/trips`, { headers: headers(token) });
    t_trips.add(res.timings.duration);
    const ok = check(res, {
      'status 200 en trips': (r) => r.status === 200,
      'respuesta JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    });
    if (!ok) errors.add(1);
    sleep(1);
  });

  // 4️⃣ Crear un nuevo viaje
  group('POST /trips', () => {
    const tripData = JSON.stringify({
      origen: 'Arroyo Seco Centro',
      destino: 'Peña de Bernal',
      conductor: 'Juan Pérez',
      metodoPago: 'efectivo',
      costo: Math.floor(Math.random() * 500) + 100,
    });
    const res = http.post(`${BASE_URL}/trips`, tripData, {
      headers: headers(token),
    });
    t_create.add(res.timings.duration);
    const ok = check(res, {
      'status 201 en creación de viaje': (r) => r.status === 201,
    });
    if (!ok) errors.add(1);
    sleep(1);
  });
}
