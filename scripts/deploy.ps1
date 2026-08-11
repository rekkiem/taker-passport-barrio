# Desplegar Taker Passport Barrio en Windows + Docker Desktop + WSL2
Write-Host "🚀 Desplegando Taker Passport Barrio..." -ForegroundColor Cyan

$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerPath) {
    Write-Host "❌ Docker no encontrado. Asegúrate de que Docker Desktop esté instalado y corriendo." -ForegroundColor Red
    exit 1
}

# Verificar que Docker Desktop está corriendo
try {
    docker info > $null 2>&1
} catch {
    Write-Host "❌ Docker Desktop no está corriendo. Ábrelo primero." -ForegroundColor Red
    exit 1
}

Set-Location "$PSScriptRoot/../docker"

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "⚠️ Archivo .env creado desde .env.example. Revisa las credenciales." -ForegroundColor Yellow
}

docker-compose down
docker-compose up --build -d

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost"
Write-Host "🔧 Backend API: http://localhost:4000"
Write-Host "🗄️  MinIO Console: http://localhost:9001"
Write-Host ""
Write-Host "Credenciales de prueba:"
Write-Host "  Giver: ana@example.com / password123"
Write-Host "  Taker: carlos@example.com / password123"
