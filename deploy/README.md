# Despliegue de SIGAP en el servidor del CIDETEC

Esta versión pone en el servidor la **prueba de la entrevista colegiada** con datos reales:

- inicio de sesión real;
- Posgrado programa y publica los horarios, y después publica la entrevista al aspirante;
- los profesores eligen sus entrevistas, llenan el acta MTC-EC y suben el acta firmada;
- los profesores del grupo consultan los documentos del aspirante;
- todo queda en la bitácora.

Las demás secciones del sistema aparecen como "aún no disponible" cuando el front trabaja con el servidor.

Servidor: `virtual.cidetec.ipn.mx` (148.204.67.192). Solo es accesible desde la red del IPN/CIDETEC o por VPN.

## 1. Requisitos (una sola vez)

En el servidor, con la cuenta `deployer`:

```bash
# Node.js 20 o 22, PostgreSQL 15+ y Nginx (Ubuntu/Debian)
sudo apt update
sudo apt install -y nginx postgresql git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && psql --version && nginx -v
```

Base de datos exclusiva para SIGAP. Cambia la contraseña por una propia y guárdala:

```bash
sudo -u postgres psql -c "CREATE USER sigap WITH PASSWORD 'UNA_CONTRASENA_SEGURA';"
sudo -u postgres psql -c "CREATE DATABASE sigap OWNER sigap;"
```

Carpetas:

```bash
sudo mkdir -p /opt/sigap/archivos /opt/sigap/datos-reales
sudo chown -R deployer:deployer /opt/sigap
chmod 700 /opt/sigap/archivos /opt/sigap/datos-reales
```

## 2. Código

```bash
cd /opt/sigap
git clone https://github.com/SIGAP-CiDETEC/Sistema-Integral-de-Gesti-n-Academica-de-Posgrado-SIGAP-.git app
cd app/sigap-backend
cp .env.example .env
nano .env    # DATABASE_URL con la contraseña de arriba, JWT_SECRET (openssl rand -base64 48), STORAGE_DIR=/opt/sigap/archivos
chmod 600 .env
npm ci && npm run build && npm run migrar
```

> Prisma está configurado sin motores nativos (adaptador de PostgreSQL), así que **no** necesita descargar nada de `binaries.prisma.sh`.

## 3. Datos reales (aspirantes, documentos, profesores y cuentas)

Los datos reales **no están en GitHub**. Copia la carpeta `datos-reales` desde tu computadora, con la VPN activa:

```bash
# En tu computadora (PowerShell), desde la carpeta donde está datos-reales
scp -r datos-reales/* deployer@148.204.67.192:/opt/sigap/datos-reales/
```

En el servidor:

```bash
cd /opt/sigap/app/sigap-backend
SIGAP_DATOS=/opt/sigap/datos-reales npm run cargar-datos
```

- Carga los 8 aspirantes A27 con sus documentos, los profesores del Colegio y las cuentas.
- Se puede repetir sin duplicar nada; solo crea lo que falta.
- Las **contraseñas temporales** de las cuentas nuevas quedan en `/opt/sigap/datos-reales/credenciales-AAAA-MM-DD.csv`, legible solo por `deployer`.
- Entrégalas a cada persona por un medio seguro. Al entrar, el sistema le pide cambiarla.

## 4. Front

```bash
cd /opt/sigap/app/sigap-frontend
npm ci
NEXT_PUBLIC_API_URL=/api npm run build
```

## 5. Servicios y Nginx

```bash
sudo cp /opt/sigap/app/deploy/sigap-api.service /opt/sigap/app/deploy/sigap-front.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sigap-api sigap-front

sudo cp /opt/sigap/app/deploy/nginx-sigap.conf /etc/nginx/sites-available/sigap
sudo ln -sf /etc/nginx/sites-available/sigap /etc/nginx/sites-enabled/sigap
sudo nginx -t && sudo systemctl reload nginx
```

Comprobación:

```bash
curl http://127.0.0.1:4000/api/health      # {"status":"ok",...}
curl -I http://virtual.cidetec.ipn.mx/login  # 200
```

HTTPS: si el CIDETEC tiene certificado para `virtual.cidetec.ipn.mx`, agrégalo al bloque de Nginx (`listen 443 ssl` …). Mientras se use solo dentro de la red institucional, HTTP funciona.

## 6. Actualizar después de cada `git push`

```bash
bash /opt/sigap/app/deploy/actualizar.sh
```

## 7. Prueba sugerida

1. **Posgrado:** con `posgrado.prueba@sigap.local` (o la cuenta de Citlalli), entra a **Entrevistas** y elige un aspirante. Captura fecha, hora y sala, y luego **Publicar horario**.
2. **Profesores:** entran 3 (`profesor1.prueba@sigap.local`, `profesor2…`, `profesor3…`, o los profesores del Colegio con su CURP). En **Mis entrevistas** eligen la entrevista; ven solo día y hora hasta que la eligen.
3. **Posgrado:** **Publicar entrevista**.
4. **Profesores:** uno llena el acta MTC-EC y queda bloqueada para los demás. La descargan, la firman los 3 y uno la sube en PDF; con eso se aplica el dictamen.
5. **Posgrado:** ve el dictamen, abre el acta firmada y revisa la bitácora.

## Certificado HTTPS

TI del CIDETEC entrega el certificado de Let's Encrypt (carpeta `virtual.cidetec.ipn.mx_ecc`). Solo se usan
`fullchain.cer` y `virtual.cidetec.ipn.mx.key`; la llave es secreta y **nunca** va al repositorio.

```bash
# En tu computadora (PowerShell), desde la carpeta virtual.cidetec.ipn.mx_ecc
scp -P 2222 fullchain.cer virtual.cidetec.ipn.mx.key deployer@148.204.67.192:~/

# En el servidor
sudo install -d -m 755 /etc/ssl/sigap
sudo install -m 644 ~/fullchain.cer /etc/ssl/sigap/fullchain.pem
sudo install -m 600 ~/virtual.cidetec.ipn.mx.key /etc/ssl/sigap/privkey.pem
rm ~/fullchain.cer ~/virtual.cidetec.ipn.mx.key
sudo cp /opt/sigap/app/deploy/nginx-sigap.conf /etc/nginx/sites-available/sigap
sudo /usr/sbin/nginx -t && sudo systemctl reload nginx
```

El certificado dura 90 días: cuando TI entregue el renovado, se repiten los mismos pasos (sin el `cp` de la
configuración). Para ver hasta cuándo es válido: `sudo openssl x509 -in /etc/ssl/sigap/fullchain.pem -noout -enddate`.

## Demostración

- **Aspirante ficticio en el servidor** (`DEMO2701`, "Aspirante Demostración Ficticio", con 8 PDF que dicen
  "DOCUMENTO DE DEMOSTRACIÓN"). Aparece junto a los aspirantes reales y permite hacer toda la entrevista colegiada:

  ```bash
  cd /opt/sigap/app/sigap-backend
  npm run aspirante-demo            # lo crea; si ya existía, lo deja como nuevo (sin entrevista ni acta)
  npm run aspirante-demo -- borrar  # al terminar la demostración: lo elimina con su entrevista, acta y bitácora
  ```

- **Portales de aspirante y alumno**: en el login, botones de "Demostración con datos ficticios". Usan datos del
  navegador, no el servidor. Se quitan compilando el front con `NEXT_PUBLIC_DEMO=0`.

## Respaldos

```bash
pg_dump -U sigap -h localhost sigap | gzip > /opt/sigap/respaldo-$(date +%F).sql.gz
tar czf /opt/sigap/archivos-$(date +%F).tgz -C /opt/sigap archivos
```

## Si algo falla

- `journalctl -u sigap-api -n 100` y `journalctl -u sigap-front -n 100`: errores de la API y del front.
- **"No se pudo conectar con el servidor"** en el front: la API no está corriendo o Nginx no envía `/api/`.
- **Una migración nueva:** cuando cambie `prisma/schema.prisma`, se agrega una carpeta en `prisma/migrations/` con su `migration.sql`, y `npm run migrar` la aplica.
