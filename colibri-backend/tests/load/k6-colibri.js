import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.BASE_URL;
const USER = __ENV.USER;
const PASS = __ENV.PASS;

export default function () {
  // Endpoint 1: login
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: USER,
    password: PASS,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, {
    'status 200 en login': (r) => r.status === 200,
  });

  // Obtener token
  const token = loginRes.json('token');

  // Endpoint 2: listar viajes (vista protegida)
  const tripsRes = http.get(`${BASE_URL}/api/v1/trips`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(tripsRes, {
    'status 200 en trips': (r) => r.status === 200,
  });

  sleep(1);
}
