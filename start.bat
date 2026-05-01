@echo off
echo ===================================================
echo   Iniciando Asistente AI (WhatsApp + Flask)
echo ===================================================

:: 1. Iniciar Microservicio Node.js en una nueva ventana
echo Iniciando Microservicio Node.js...
start "WhatsApp Node.js Microservice" cmd /k "cd /d %~dp0 && node index.js"

:: 2. Iniciar Backend de Flask en otra ventana (activando el entorno virtual si existe)
echo Iniciando Backend Python (Flask)...
start "Python Flask Backend" cmd /k "cd /d %~dp0\flask_backend && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else (echo [INFO] Entorno virtual no detectado. Corriendo globalmente...) && python app.py"

echo.
echo ✅ Ambos servicios se estan ejecutando en ventanas separadas.
echo Puedes cerrar esta ventana.
pause
