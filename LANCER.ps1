# StudyTokens - Lanceur PowerShell (alternative a LANCER.bat)
# Clic-droit -> "Executer avec PowerShell"

Set-Location $PSScriptRoot
Write-Host ""
Write-Host "  StudyTokens - Lancement" -ForegroundColor Cyan
Write-Host ""

# Verifier Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  [ERREUR] Node.js non trouve. Installez-le sur https://nodejs.org" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

# Installer les dependances si necessaire
if (-not (Test-Path "node_modules")) {
    Write-Host "  [INSTALL] Installation des dependances..." -ForegroundColor Yellow
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERREUR] npm install a echoue." -ForegroundColor Red
        Read-Host "Appuyez sur Entree"
        exit 1
    }
}

Write-Host "  [OK] Lancement..." -ForegroundColor Green
npx electron .
