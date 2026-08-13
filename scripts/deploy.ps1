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
    # Genera secretos aleatorios para no dejar los valores públicos del .env.example
    $jwt = -join ((48..57)+(97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $dbPass = -join ((48..57)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
    $minioPass = -join ((48..57)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
    (Get-Content .env) `
        -replace '^JWT_SECRET=.*', "JWT_SECRET=$jwt" `
        -replace '^DB_PASSWORD=.*', "DB_PASSWORD=$dbPass" `
        -replace '^MINIO_PASSWORD=.*', "MINIO_PASSWORD=$minioPass" `
        | Set-Content .env
    Write-Host "🔐 Archivo .env creado con secretos generados aleatoriamente." -ForegroundColor Green
}

docker-compose down
docker-compose up --build -d

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:8080"
Write-Host "🔧 Backend API: http://localhost:4000"
Write-Host "🗄️  MinIO Console: http://localhost:9001"
Write-Host "🔌 Evolution API: http://localhost:8081"
Write-Host ""
Write-Host "Credenciales de prueba:"
Write-Host "  Giver: ana@example.com / password123"
Write-Host "  Taker: carlos@example.com / password123"
