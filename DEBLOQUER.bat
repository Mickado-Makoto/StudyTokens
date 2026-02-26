@echo off
title StudyTokens - Deblocage des fichiers
echo.
echo  Suppression des restrictions de securite Windows...
echo  (Fichiers telecharges depuis OneDrive ou Internet)
echo.

cd /d "%~dp0"

set COUNT=0

for /r . %%F in (*.js *.html *.css *.bat *.json *.md *.rules) do (
  if exist "%%F:Zone.Identifier" (
    del /q "%%F:Zone.Identifier" >nul 2>&1
    echo  [OK] Debloque: %%~nxF
    set /a COUNT+=1
  )
)

echo.
echo  Deblocage termine.
echo  Tu peux maintenant relancer LANCER.bat sans avertissement.
echo.
pause
