@echo off
:: Auto-unblock all files first
powershell -NoProfile -NonInteractive -Command "Get-ChildItem '%~dp0' -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue" >nul 2>&1

title StudyTokens - Construction de l'installeur
color 0B

echo.
echo  +------------------------------------------------+
echo  ^|   Construction de l'installeur StudyTokens     ^|
echo  ^|   Le resultat sera dans le dossier dist/        ^|
echo  +------------------------------------------------+
echo.

cd /d "%~dp0"

:: Check Node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  color 0C
  echo  [ERREUR] Node.js introuvable. Installez https://nodejs.org
  pause & exit /b 1
)

:: Install deps
if not exist "node_modules\" (
  echo  [INSTALL] npm install...
  call npm install --silent
)

echo  [BUILD] Construction en cours...
echo  (Cela prend 1 a 3 minutes)
echo.

call npm run build

if %ERRORLEVEL% neq 0 (
  color 0C
  echo.
  echo  [ERREUR] La construction a echoue.
  echo  Verifie les logs ci-dessus.
  pause & exit /b 1
)

echo.
color 0A
echo  [OK] Installeur cree dans le dossier dist/
echo  Tu peux distribuer le fichier .exe aux utilisateurs.
echo.
explorer dist
pause
