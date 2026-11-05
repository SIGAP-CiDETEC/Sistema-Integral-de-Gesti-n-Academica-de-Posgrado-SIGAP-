# Script para subir el nuevo aspirante MTCA2722 con expediente completo al servidor SIGAP
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Subiendo aspirante MTCA2722 al servidor virtual CIDETEC " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$server = "148.204.67.192"
$port = 2222
$user = "deployer"
$datosLocales = "C:\Users\kevin\Downloads\SIGAP\datos-reales"

Write-Host "`n[1/3] Subiendo datos.json actualizado..." -ForegroundColor Yellow
scp -P $port "$datosLocales\datos.json" "${user}@${server}:/opt/sigap/datos-reales/"

Write-Host "`n[2/3] Subiendo expediente completo de MTCA2722 (8 documentos)..." -ForegroundColor Yellow
scp -P $port -r "$datosLocales\aspirantes\MTCA2722" "${user}@${server}:/opt/sigap/datos-reales/aspirantes/"

Write-Host "`n[3/3] Ejecutando carga de datos en la base de datos del servidor..." -ForegroundColor Yellow
ssh -p $port -t "${user}@${server}" "cd /opt/sigap/app/sigap-backend && SIGAP_DATOS=/opt/sigap/datos-reales npm run cargar-datos"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ¡Listo! El expediente de MTCA2722 ha sido cargado en el servidor." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
