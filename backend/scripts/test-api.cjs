// Corre la colección de Postman de MultiServ con newman (npm run test:api).
//
// Necesita el backend encendido (http://localhost:3001) y la base real, por
// eso NO está en el CI. Las contraseñas se leen de backend/.env en memoria
// (SEED_DUENO_PASSWORD y SEED_TECNICO_PASSWORD) y se pasan a newman como
// variables de environment; nunca se imprimen ni se escriben en archivos.
//
// El reporte HTML usa skipSensitiveData: no guarda cuerpos de petición o
// respuesta ni headers (ni la contraseña del login ni el token Bearer).
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const newman = require('newman');

const raiz = path.resolve(__dirname, '..', '..');
const carpeta = path.join(raiz, 'docs', 'calidad', '09_Postman');

const archivoEnv = path.join(__dirname, '..', '.env');
if (!fs.existsSync(archivoEnv)) {
  console.error('No existe backend/.env: no hay contraseñas para el login.');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(archivoEnv));
const faltan = ['SEED_DUENO_PASSWORD', 'SEED_TECNICO_PASSWORD'].filter((k) => !env[k]);
if (faltan.length > 0) {
  console.error('Faltan variables en backend/.env: ' + faltan.join(', '));
  process.exit(1);
}

newman.run(
  {
    collection: path.join(carpeta, 'MultiServ_API.postman_collection.json'),
    environment: path.join(carpeta, 'MultiServ_Local.postman_environment.json'),
    envVar: [
      { key: 'passwordDueno', value: env.SEED_DUENO_PASSWORD },
      { key: 'passwordTecnico', value: env.SEED_TECNICO_PASSWORD },
    ],
    reporters: ['cli', 'htmlextra'],
    reporter: {
      cli: { noSummary: false },
      htmlextra: {
        export: path.join(carpeta, 'reporte-html', 'index.html'),
        title: 'MultiServ · Pruebas de API (Postman/newman)',
        browserTitle: 'MultiServ API',
        skipSensitiveData: true,
        skipHeaders: 'Authorization',
        omitRequestBodies: true,
        omitResponseBodies: true,
        hideRequestBody: ['API-01 Login Dueño correcto → 200 y token', 'AUX-01 Login Técnico → 200 y token'],
      },
    },
  },
  (err, resumen) => {
    if (err) {
      console.error('newman no pudo correr la colección:', err.message);
      process.exit(1);
    }
    const fallos = resumen.run.failures.length;
    process.exit(fallos > 0 ? 1 : 0);
  },
);
