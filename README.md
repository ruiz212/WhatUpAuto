# WhatsUpAuto - Asistente de IA para WhatsApp 🤖📱

WhatsUpAuto es un sistema automatizado que integra un cliente de WhatsApp Web con un backend inteligente basado en **Google Gemini**. Permite interactuar de forma natural, programar eventos en Google Calendar, guardar un historial de conversaciones y auto-gestionar su sesión de forma persistente.

## 🚀 Características Principales

1. **Interacción Natural con IA:** Utiliza el modelo de lenguaje de Gemini para responder mensajes y mantener conversaciones complejas.
2. **Gestión de Agenda (Google Calendar):** Detecta intenciones de reuniones y eventos, agendándolos automáticamente en Google Calendar.
3. **Resúmenes Automáticos:** Si te mencionan o se acumulan muchos mensajes en un grupo, genera un resumen de lo que ocurrió mientras no estabas.
4. **Registro en Excel:** Todo el historial de chats y eventos se guarda de forma ordenada en un archivo `.xlsx` en el backend.
5. **Autenticación Persistente (MongoDB):** Utiliza `wwebjs-mongo` para almacenar la sesión de WhatsApp en la nube, evitando la necesidad de escanear el QR constantemente cuando se despliega en plataformas como Render.
6. **Manejo de Archivos:** Permite descargar y enviar archivos adjuntos de forma local o hacia el usuario.

## 🏗️ Arquitectura del Sistema

El proyecto está compuesto por dos microservicios que trabajan en conjunto a través de peticiones HTTP:

- **Frontend / Cliente (Node.js):**
  - Desarrollado con `whatsapp-web.js` y Express.
  - Escucha los mensajes entrantes de WhatsApp y los reenvía al backend.
  - Almacena la sesión de autenticación en MongoDB (`RemoteAuth`).
  - Emite las respuestas generadas por la IA de vuelta a los usuarios o grupos.

- **Backend Inteligente (Python / Flask):**
  - Desarrollado con Flask.
  - Procesa los mensajes usando `google-generativeai` (Gemini).
  - Interactúa con la API de Google Calendar y genera reportes en Excel.
  - Contiene la lógica de negocio, manejo de historiales y reglas de filtrado de grupos.

## ⚙️ Requisitos Previos

- Node.js (v18 o superior)
- Python (v3.10 o superior)
- Base de datos MongoDB (Ej. Atlas Free Tier)
- Credenciales de API (Google Gemini, Google Cloud Service Account para Calendar)

## 🛠️ Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/ruiz212/WhatUpAuto.git
   cd WhatUpAuto
   ```

2. **Configurar Variables de Entorno:**
   - En la raíz del proyecto, crea un archivo `.env` para Node.js:
     ```env
     PORT=3000
     FLASK_WEBHOOK_URL=http://localhost:5000/webhook
     MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
     ```
   - Dentro de la carpeta `flask_backend`, crea otro archivo `.env` (guíate del `.env.example`).
   - Coloca tu archivo `credentials.json` (de Google Cloud) dentro de la carpeta `flask_backend`.

3. **Instalar Dependencias:**
   - **Node.js:** `npm install`
   - **Python:** `cd flask_backend && pip install -r requirements.txt`

4. **Ejecutar Localmente:**
   - Puedes usar el archivo `start.bat` (en Windows) o `start.sh` (en Linux/Mac) para levantar ambos servicios al mismo tiempo.
   - Escanea el código QR en la terminal la primera vez.

## ☁️ Despliegue en Render (Docker)

Este proyecto incluye un `Dockerfile` optimizado que instala Chromium, Node.js y Python en un solo contenedor, ideal para plataformas como Render.

1. Conecta este repositorio en Render y crea un nuevo **Web Service**.
2. Selecciona **Docker** como entorno.
3. En la sección de **Environment Variables**, añade **todas** las variables de ambos archivos `.env`.
   - `MONGODB_URI`, `GEMINI_API_KEY`, `BOSS_NUMBER`, `ALLOWED_GROUPS`, etc.
4. Despliega la aplicación. En la pestaña de Logs aparecerá el código QR. ¡Escanéalo y listo!

*Nota para planes gratuitos de Render:* Si usas el plan gratuito, Render apaga el servidor tras 15 minutos de inactividad. Gracias a MongoDB, tu sesión no se perderá, pero es recomendable usar un servicio de ping (como cron-job.org) apuntando a la URL de Render cada 10 minutos para mantenerlo despierto.

## 📄 Estructura del Código
```text
/
├── index.js                  # Microservicio Node.js (WhatsApp Client)
├── package.json              # Dependencias de Node
├── Dockerfile                # Configuración de contenedor para producción
├── start.sh / start.bat      # Scripts de inicio
├── render.yaml               # Blueprint de Render (Opcional)
└── flask_backend/            # Backend en Python
    ├── app.py                # Servidor Flask principal
    ├── requirements.txt      # Dependencias de Python
    └── services/             # Lógica de negocio (IA, Calendar, Excel)
```
