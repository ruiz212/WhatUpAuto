#!/bin/bash

echo "Iniciando Backend Flask..."
cd /app/flask_backend
python3 app.py &
FLASK_PID=$!

echo "Iniciando Microservicio Node.js..."
cd /app
node index.js &
NODE_PID=$!

# Esperar a que cualquiera de los procesos termine (para mantener el contenedor vivo)
wait -n $FLASK_PID $NODE_PID
