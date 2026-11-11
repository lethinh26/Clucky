param(
    [ValidateSet('up', 'stop', 'status', 'check')][string]$Action = 'up',
    [string[]]$Services = @()
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$credentialPath = Join-Path $PSScriptRoot 'secrets/firebase-service-account.json'
$frontendEnv = Join-Path $PSScriptRoot 'frontend/nextjs/.env'
$localEnv = Join-Path $PSScriptRoot '.env.docker'
if (!(Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
    throw 'Place your Firebase service account JSON in secrets/firebase-service-account.json (ignored by Git).'
}
if (!(Test-Path -LiteralPath $frontendEnv -PathType Leaf)) {
    throw 'Set the three NEXT_PUBLIC_FIREBASE_* values in frontend/nextjs/.env first.'
}
try {
    $credential = Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json
} catch {
    throw 'Firebase service account file is not valid JSON.'
}
if ($credential.type -ne 'service_account' -or !$credential.private_key -or !$credential.client_email -or
    $credential.project_id -notmatch '^[a-z][a-z0-9-]{4,28}[a-z0-9]$') {
    throw 'Firebase service account file is incomplete.'
}
if (!(Test-Path -LiteralPath $localEnv)) {
    $volumes = & docker volume ls --format '{{.Name}}'
    if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop (Linux containers) before running this script.' }
    if ($volumes -contains 'clucky-local-postgres-data') {
        throw 'Local database already exists. Restore its .env.docker; refusing to generate a different database password.'
    }
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 32
        $random.GetBytes($bytes)
        $databasePassword = [Convert]::ToBase64String($bytes)
        $random.GetBytes($bytes)
        $jwtSecret = [Convert]::ToBase64String($bytes)
    } finally {
        $random.Dispose()
    }
    $values = @(
        'IMAGE_TAG=local'
        'VPS_WORKDIR=.'
        'POSTGRES_USER=clucky'
        'DB_NAME=clucky'
        "POSTGRES_PASSWORD='$databasePassword'"
        "JWT_SECRET='$jwtSecret'"
        "FIREBASE_PROJECT_ID=$($credential.project_id)"
        'FRONTEND_CUSTOMER_URL=http://localhost:3000'
        'FRONTEND_ADMIN_URL=http://localhost:3001'
        'AUTH_COOKIE_SECURE=false'
    )
    [IO.File]::WriteAllLines($localEnv, $values, [Text.UTF8Encoding]::new($false))
    Write-Host 'Created private .env.docker; keep it for subsequent starts (database credentials must stay unchanged).'
}
$composeArgs = @('--project-name', 'clucky-local', '--project-directory', $PSScriptRoot,
    '--env-file', $frontendEnv, '--env-file', $localEnv,
    '-f', 'deploy/backend/compose.yml', '-f', 'deploy/frontend/compose.yml', '-f', 'compose.local.yml')
$rendered = & docker compose @composeArgs config --format json
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose configuration failed.' }
$configuration = ($rendered -join "`n") | ConvertFrom-Json
if ($configuration.services.customer.build.args.NEXT_PUBLIC_FIREBASE_PROJECT_ID -ne $credential.project_id -or
    $configuration.services.'identity-service'.environment.FIREBASE_PROJECT_ID -ne $credential.project_id) {
    throw 'Firebase project must match in frontend/nextjs/.env, .env.docker and the service account.'
}
foreach ($service in $Services) {
    if ($service -notin $configuration.services.PSObject.Properties.Name) { throw "Unknown service: $service" }
}
foreach ($name in @('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'VITE_MAPBOX_ACCESS_TOKEN')) {
    $frontend = if ($name.StartsWith('NEXT_PUBLIC')) { 'customer' } else { 'admin' }
    if ($Services.Count -and $frontend -notin $Services) { continue }
    $token = $configuration.services.$frontend.build.args.$name
    if ($token -and !$token.StartsWith('pk.')) { throw "$name must be a public pk. token, never a secret token." }
}
if ($Action -eq 'check') {
    $mount = $configuration.services.'identity-service'.volumes | Where-Object target -eq '/run/secrets/firebase-service-account.json'
    if (@($configuration.services.PSObject.Properties).Count -ne 18 -or !$mount.read_only -or
        $configuration.networks.default.name -ne 'clucky-local' -or
        $configuration.volumes.'postgres-data'.name -ne 'clucky-local-postgres-data' -or
        $configuration.services.'identity-service'.environment.AUTH_COOKIE_SECURE -ne 'false') {
        throw 'Local stack isolation, credential mount or cookie configuration is invalid.'
    }
    Write-Host 'Local Compose configuration and Firebase project checks passed; no containers started.'
    return
}
if ($Action -eq 'up') {
    & docker compose @composeArgs --parallel 2 build @Services
    if ($LASTEXITCODE -ne 0) { throw 'Image build failed; existing containers and data were not removed.' }
    if ($Services.Count) {
        foreach ($service in $Services) {
            & docker compose @composeArgs up -d --no-deps --no-build --wait --wait-timeout 600 $service
            if ($LASTEXITCODE -ne 0) { throw "Startup failed for $service. Data was retained." }
        }
    } else {
        & docker compose @composeArgs run --rm --no-deps --user 0 --entrypoint chown kafka 1000:1000 /tmp/kraft-combined-logs
        if ($LASTEXITCODE -ne 0) { throw 'Kafka volume initialization failed.' }
        & docker compose @composeArgs up -d --no-build --wait --wait-timeout 600
        if ($LASTEXITCODE -ne 0) { throw 'Startup failed; inspect clucky-local in Docker Desktop. Data was retained.' }
    }
    & docker compose @composeArgs ps @Services
    Write-Host 'Customer: http://localhost:3000 | Admin: http://localhost:3001 | Gateway: http://localhost:8080 | Kafka UI: http://localhost:8088'
} elseif ($Action -eq 'stop') {
    & docker compose @composeArgs stop @Services
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose stop failed.' }
} else {
    & docker compose @composeArgs ps --all @Services
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose status failed.' }
}
