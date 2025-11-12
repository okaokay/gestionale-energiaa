@echo off
setlocal enabledelayedexpansion

REM ═══════════════════════════════════════════════════════
REM GESTIONALE ENERGIA - SCRIPT DEPLOYMENT AUTOMATICO (WINDOWS)
REM ═══════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════
echo 🚀 GESTIONALE ENERGIA - DEPLOYMENT AUTOMATICO
echo ═══════════════════════════════════════════════════════
echo.

REM Verifica prerequisiti
echo [STEP] Verifico prerequisiti...

REM Verifica Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker non trovato! Installa Docker Desktop da https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Verifica Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose non trovato! Assicurati che Docker Desktop sia installato correttamente.
    pause
    exit /b 1
)

echo [SUCCESS] Prerequisiti verificati!

REM Verifica se siamo nella directory corretta
if not exist "docker-compose.yml" (
    echo [ERROR] File docker-compose.yml non trovato! Assicurati di essere nella directory del progetto.
    pause
    exit /b 1
)

REM Crea file .env se non esiste
echo [STEP] Configuro ambiente...

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [SUCCESS] File .env creato da .env.example
    ) else (
        echo [ERROR] File .env.example non trovato!
        pause
        exit /b 1
    )
) else (
    echo [WARNING] File .env già esistente, non sovrascritto.
)

REM Chiedi modalità di deployment
echo.
echo Scegli modalità di deployment:
echo 1) Sviluppo (porta 5173 + 3001)
echo 2) Produzione (porta 80 + 3001)
echo.
set /p choice="Inserisci scelta (1 o 2): "

if "%choice%"=="1" (
    set "COMPOSE_COMMAND=docker-compose up app --build"
    set "MODE=sviluppo"
    set "FRONTEND_URL=http://localhost:5173"
) else if "%choice%"=="2" (
    set "COMPOSE_COMMAND=docker-compose --profile production up app-prod --build"
    set "MODE=produzione"
    set "FRONTEND_URL=http://localhost"
) else (
    echo [ERROR] Scelta non valida!
    pause
    exit /b 1
)

REM Ferma container esistenti
echo [STEP] Fermo container esistenti...
docker-compose down >nul 2>&1

REM Pulisci immagini vecchie (opzionale)
set /p clean_images="Vuoi pulire le immagini Docker vecchie? (y/N): "
if /i "%clean_images%"=="y" (
    echo [STEP] Pulisco immagini Docker vecchie...
    docker system prune -f
)

REM Avvia deployment
echo [STEP] Avvio deployment in modalità %MODE%...
echo.
echo Comando eseguito: %COMPOSE_COMMAND%
echo.
echo [INFO] Avvio in corso... Attendi qualche secondo...
echo.

REM Esegui il comando
start /b %COMPOSE_COMMAND%

REM Aspetta che i container si avviino
timeout /t 15 /nobreak >nul

REM Verifica se i container sono attivi
docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Errore durante l'avvio dei container!
    echo.
    echo Log degli errori:
    docker-compose logs --tail=20
    pause
    exit /b 1
)

echo [SUCCESS] Container avviati correttamente!
echo.
echo ═══════════════════════════════════════════════════════
echo 🎉 DEPLOYMENT COMPLETATO CON SUCCESSO!
echo ═══════════════════════════════════════════════════════
echo.
echo 📱 ACCESSO APPLICAZIONE:
echo    Frontend: %FRONTEND_URL%
echo    Backend:  http://localhost:3001
echo.
echo 🔑 CREDENZIALI DEFAULT:
echo    Email:    admin@gestionale.it
echo    Password: Admin123!
echo.
echo 🛠️  COMANDI UTILI:
echo    Ferma:    docker-compose down
echo    Log:      docker-compose logs -f
echo    Riavvia:  docker-compose up --build
echo.
echo 💡 L'applicazione è ora in esecuzione!
echo    Apri il browser e vai su %FRONTEND_URL%
echo.
echo Premi un tasto per aprire il browser automaticamente...
pause >nul

REM Apri il browser
start %FRONTEND_URL%

echo.
echo ✅ Browser aperto! L'applicazione dovrebbe essere visibile.
echo.
echo Per fermare l'applicazione:
echo 1. Chiudi questa finestra OPPURE
echo 2. Apri un nuovo terminale e digita: docker-compose down
echo.
pause