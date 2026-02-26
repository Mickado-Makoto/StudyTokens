@echo off
:: Auto-unblock via PowerShell inline (first run only)
powershell -NoProfile -NonInteractive -Command "Get-ChildItem '%~dp0' -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue" >nul 2>&1

title StudyTokens
color 0A
echo.
echo  +--------------------------------------+
echo  ^|      StudyTokens  - Lancement        ^|
echo  +--------------------------------------+
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  color 0C
  echo  [ERREUR] Node.js introuvable.
  echo  Installez-le sur https://nodejs.org
  pause & exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules\" (
  echo  [INSTALL] Installation des dependances...
  call npm install --silent
  if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERREUR] npm install a echoue.
    pause & exit /b 1
  )
)

echo  [OK] Lancement...
echo.
call npx electron .
if %ERRORLEVEL% neq 0 (
  call node_modules\.bin\electron .
)

:fin
