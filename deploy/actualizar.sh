#!/usr/bin/env bash
# Actualiza SIGAP en el servidor con lo último de GitHub (main): dependencias, migraciones, compilación y reinicio.
# Uso (en el servidor):  bash /opt/sigap/app/deploy/actualizar.sh
set -euo pipefail
cd /opt/sigap/app
git pull --ff-only

cd sigap-backend
npm ci
npm run build
npm run migrar

cd ../sigap-frontend
npm ci
# El front habla con la API por el mismo dominio (Nginx envía /api al puerto 4000)
NEXT_PUBLIC_API_URL=/api npm run build

sudo systemctl restart sigap-api sigap-front
sleep 3
curl -fsS http://127.0.0.1:4000/api/health && echo && echo "SIGAP actualizado."
