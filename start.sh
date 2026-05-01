#!/bin/bash

# Generar archivo credentials.json desde la variable de entorno para Render
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
    echo "Generando credentials.json desde la variable de entorno..."
    echo "$GOOGLE_CREDENTIALS_JSON" > /app/flask_backend/credentials.json
fi

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
