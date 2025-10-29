// Script K6 para Colibri - Pruebas de Carga
// Generado inicialmente con Grafana k6 Studio y mejorado
// Frontend: https://colibri-frontend.vercel.app/
// Backend: https://colibri-backend-od5b.onrender.com

import { group, sleep, check } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// ========================================
// MÉTRICAS PERSONALIZADAS
// ========================================
const errorRate = new Rate('errors');
const homePageDuration = new Trend('homepage_duration');
const loginDuration = new Trend('login_duration');
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const httpFailures = new Counter('http_failures');

// ========================================
// CONFIGURACIÓN DE PRUEBAS
// ========================================
export const options = {
  // Etapas de carga progresiva
  stages: [
    { target: 20, duration: '1m' },      // Rampa: 0 → 20 usuarios en 1min
    { target: 20, duration: '3m30s' },   // Sostenido: 20 usuarios por 3.5min
    { target: 0, duration: '1m' },       // Descenso: 20 → 0 en 1min
  ],
  
  // Umbrales (thresholds) de aceptación
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% < 2s (ajustado para Render/Vercel)
    'http_req_failed': ['rate<0.05'],                   // Menos de 5% errores
    'errors': ['rate<0.1'],                             // Menos de 10% errores generales
    'login_duration': ['p(95)<3000'],                   // Login p95 < 3s
    'homepage_duration': ['p(95)<2000'],                // Homepage p95 < 2s
    'successful_logins': ['count>0'],                   // Al menos 1 login exitoso
  },
};

// ========================================
// CONFIGURACIÓN DE URLS
// ========================================
const FRONTEND_URL = __ENV.FRONTEND_URL || 'https://colibri-frontend.vercel.app';
const BACKEND_URL = __ENV.BACKEND_URL || 'https://colibri-backend-od5b.onrender.com';

// Usuarios de prueba para Colibri
const testUsers = [
  { email: 'test@colibri.com', password: '1234' },
  // Agrega más usuarios si los tienes disponibles
  // { email: 'user2@colibri.com', password: 'pass123' },
  // { email: 'user3@colibri.com', password: 'pass123' },
];

// ========================================
// SETUP - Ejecuta una vez al inicio
// ========================================
export function setup() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     INICIANDO PRUEBAS DE CARGA - COLIBRI              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🔌 Backend:  ${BACKEND_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`👥 Virtual Users: 0 → 20 (sostenido) → 0`);
  console.log(`⏱️  Duración total: ~5.5 minutos`);
  console.log('');
  
  return { 
    startTime: Date.now(),
    frontendUrl: FRONTEND_URL,
    backendUrl: BACKEND_URL,
  };
}

// ========================================
// FUNCIÓN PRINCIPAL - Ejecuta por cada VU
// ========================================
export default function (data) {
  // Seleccionar usuario aleatorio
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // ==========================================
  // ESCENARIO 1: CARGA DE PÁGINA PRINCIPAL
  // ==========================================
  testHomePage();
  
  sleep(Math.random() * 2 + 1); // Pausa 1-3 segundos
  
  // ==========================================
  // ESCENARIO 2: FLUJO DE LOGIN
  // ==========================================
  testLoginFlow(user);
  
  sleep(Math.random() * 2 + 1); // Pausa 1-3 segundos
}

// ========================================
// ESCENARIO 1: PÁGINA PRINCIPAL
// ========================================
function testHomePage() {
  const startTime = Date.now();
  
  group('Home Page Load', function () {
    // Paso 1: Cargar página principal
    const params = {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'es-ES,es;q=0.9',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'upgrade-insecure-requests': '1',
      },
      tags: { name: 'GET_HomePage' },
    };
    
    const resp = http.get(`${FRONTEND_URL}/`, params);
    
    const homeOk = check(resp, {
      '✓ Homepage status 200': (r) => r.status === 200,
      '✓ Homepage has content': (r) => r.body.length > 1000,
      '✓ Homepage loads < 3s': (r) => r.timings.duration < 3000,
    });
    
    if (!homeOk) {
      errorRate.add(1);
      httpFailures.add(1);
    }
    
    sleep(0.5);
    
    // Paso 2: Cargar index.html (PWA)
    const indexParams = {
      headers: {
        'accept': '*/*',
        'referer': `${FRONTEND_URL}/sw.js`,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      tags: { name: 'GET_Index' },
    };
    
    const indexResp = http.get(`${FRONTEND_URL}/index.html`, indexParams);
    
    const indexOk = check(indexResp, {
      '✓ Index status 200': (r) => r.status === 200,
    });
    
    if (!indexOk) {
      errorRate.add(1);
    }
  });
  
  const duration = Date.now() - startTime;
  homePageDuration.add(duration);
}

// ========================================
// ESCENARIO 2: FLUJO DE LOGIN
// ========================================
function testLoginFlow(user) {
  const startTime = Date.now();
  
  group('Login Flow', function () {
    // Paso 1: OPTIONS preflight request (CORS)
    const optionsParams = {
      headers: {
        'accept': '*/*',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
        'origin': FRONTEND_URL,
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-dest': 'empty',
      },
      tags: { name: 'OPTIONS_Login' },
    };
    
    const optionsResp = http.options(`${BACKEND_URL}/auth/login`, null, optionsParams);
    
    check(optionsResp, {
      '✓ OPTIONS status 204': (r) => r.status === 204,
    });
    
    sleep(0.3);
    
    // Paso 2: POST login con credenciales
    const loginParams = {
      headers: {
        'content-type': 'application/json',
        'accept': '*/*',
        'origin': FRONTEND_URL,
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
      },
      tags: { name: 'POST_Login' },
    };
    
    const payload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    
    const loginResp = http.post(`${BACKEND_URL}/auth/login`, payload, loginParams);
    
    const loginSuccess = check(loginResp, {
      '✓ Login status 200': (r) => r.status === 200,
      '✓ Login response has data': (r) => r.body.length > 0,
      '✓ Login time < 5s': (r) => r.timings.duration < 5000,
      '✓ Valid JSON response': (r) => {
        try {
          const json = r.json();
          return json !== null;
        } catch (e) {
          return false;
        }
      },
    });
    
    if (loginSuccess) {
      successfulLogins.add(1);
      
      // Intentar extraer token si existe
      try {
        const json = loginResp.json();
        if (json.token || json.access_token || json.accessToken) {
          // Token disponible para futuras requests
          __VU.authToken = json.token || json.access_token || json.accessToken;
          __VU.userData = json.user || json.data || null;
        }
      } catch (e) {
        console.error(`Error parsing login response: ${e}`);
      }
    } else {
      failedLogins.add(1);
      errorRate.add(1);
      httpFailures.add(1);
      
      // Log de depuración en caso de fallo
      if (loginResp.status !== 200) {
        console.error(`Login failed: Status ${loginResp.status} - ${loginResp.body.substring(0, 200)}`);
      }
    }
  });
  
  const duration = Date.now() - startTime;
  loginDuration.add(duration);
}

// ========================================
// TEARDOWN - Ejecuta una vez al final
// ========================================
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       PRUEBAS DE CARGA FINALIZADAS - COLIBRI          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`⏱️  Duración total: ${duration.toFixed(2)} segundos`);
  console.log(`📅 Timestamp fin: ${new Date().toISOString()}`);
  console.log('📊 Revisa el summary para métricas detalladas');
  console.log('');
}

// ========================================
// MANEJO DE RESUMEN PERSONALIZADO
// ========================================
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

// Función auxiliar para generar resumen de texto
function textSummary(data, options) {
  const indent = options.indent || '';
  
  let summary = '\n' + indent + '═'.repeat(70) + '\n';
  summary += indent + '             RESUMEN DE PRUEBAS K6 - COLIBRI\n';
  summary += indent + '═'.repeat(70) + '\n\n';
  
  // Métricas HTTP generales
  summary += indent + '📊 MÉTRICAS HTTP GENERALES:\n';
  summary += indent + '─'.repeat(70) + '\n';
  summary += indent + `  Total Requests:        ${data.metrics.http_reqs?.values.count || 0}\n`;
  summary += indent + `  Failed Requests:       ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%\n`;
  summary += indent + `  Avg Duration:          ${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms\n`;
  summary += indent + `  Min Duration:          ${(data.metrics.http_req_duration?.values.min || 0).toFixed(2)}ms\n`;
  summary += indent + `  Max Duration:          ${(data.metrics.http_req_duration?.values.max || 0).toFixed(2)}ms\n`;
  summary += indent + `  P90 Duration:          ${(data.metrics.http_req_duration?.values['p(90)'] || 0).toFixed(2)}ms\n`;
  summary += indent + `  P95 Duration:          ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += indent + `  P99 Duration:          ${(data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms\n\n`;
  
  // Métricas de Homepage
  summary += indent + '🏠 MÉTRICAS DE HOMEPAGE:\n';
  summary += indent + '─'.repeat(70) + '\n';
  summary += indent + `  Homepage Avg:          ${(data.metrics.homepage_duration?.values.avg || 0).toFixed(2)}ms\n`;
  summary += indent + `  Homepage P95:          ${(data.metrics.homepage_duration?.values['p(95)'] || 0).toFixed(2)}ms\n\n`;
  
  // Métricas de Login
  summary += indent + '🔐 MÉTRICAS DE LOGIN:\n';
  summary += indent + '─'.repeat(70) + '\n';
  summary += indent + `  Successful Logins:     ${data.metrics.successful_logins?.values.count || 0}\n`;
  summary += indent + `  Failed Logins:         ${data.metrics.failed_logins?.values.count || 0}\n`;
  summary += indent + `  Login Avg Duration:    ${(data.metrics.login_duration?.values.avg || 0).toFixed(2)}ms\n`;
  summary += indent + `  Login P95 Duration:    ${(data.metrics.login_duration?.values['p(95)'] || 0).toFixed(2)}ms\n\n`;
  
  // Tasa de errores
  summary += indent + '❌ TASA DE ERRORES:\n';
  summary += indent + '─'.repeat(70) + '\n';
  summary += indent + `  Error Rate:            ${((data.metrics.errors?.values.rate || 0) * 100).toFixed(2)}%\n`;
  summary += indent + `  HTTP Failures:         ${data.metrics.http_failures?.values.count || 0}\n\n`;
  
  // Virtual Users
  summary += indent + '👥 USUARIOS VIRTUALES:\n';
  summary += indent + '─'.repeat(70) + '\n';
  summary += indent + `  VUs Max:               ${data.metrics.vus_max?.values.max || 0}\n`;
  summary += indent + `  VUs Average:           ${(data.metrics.vus?.values.avg || 0).toFixed(2)}\n\n`;
  
  // Estado de Thresholds
  summary += indent + '✓ ESTADO DE THRESHOLDS:\n';
  summary += indent + '─'.repeat(70) + '\n';
  
  const failedRate = (data.metrics.http_req_failed?.values.rate || 0) * 100;
  const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const errorRateVal = (data.metrics.errors?.values.rate || 0) * 100;
  const successLogins = data.metrics.successful_logins?.values.count || 0;
  
  summary += indent + `  Error Rate < 5%:       ${failedRate < 5 ? '✅ PASS' : '❌ FAIL'} (${failedRate.toFixed(2)}%)\n`;
  summary += indent + `  P95 < 2000ms:          ${p95 < 2000 ? '✅ PASS' : '⚠️  WARN'} (${p95.toFixed(2)}ms)\n`;
  summary += indent + `  Overall Errors < 10%:  ${errorRateVal < 10 ? '✅ PASS' : '❌ FAIL'} (${errorRateVal.toFixed(2)}%)\n`;
  summary += indent + `  At least 1 login:      ${successLogins > 0 ? '✅ PASS' : '❌ FAIL'} (${successLogins})\n`;
  
  summary += '\n' + indent + '═'.repeat(70) + '\n';
  
  // Resumen final
  const allPassed = failedRate < 5 && errorRateVal < 10 && successLogins > 0;
  summary += indent + `🎯 RESULTADO FINAL: ${allPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}\n`;
  summary += indent + '═'.repeat(70) + '\n\n';
  
  return summary;
}