FROM ubuntu:22.04

# Configurar variables de entorno para evitar interacciones durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar Python, Node.js y dependencias de Chromium (para Puppeteer)
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    chromium-browser \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos
COPY package*.json ./
RUN npm install

# Copiar requerimientos de Python
COPY flask_backend/requirements.txt ./flask_backend/
RUN pip3 install --no-cache-dir -r flask_backend/requirements.txt

# Copiar el resto del código
COPY . .

# Variables de entorno para Puppeteer y servicios
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV FLASK_WEBHOOK_URL=http://localhost:5000/webhook
ENV NODE_URL=http://localhost:3000

# Dar permisos de ejecución al script de inicio
RUN chmod +x start.sh

# Render usa la variable PORT para el tráfico web (por defecto expone esto)
# Vamos a exponer el puerto 3000 de Node
EXPOSE 3000

# Iniciar ambos servicios
CMD ["./start.sh"]
