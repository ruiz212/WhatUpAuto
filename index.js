require('dotenv').config();
const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Inicializar Express
const app = express();
app.use(express.json());

// Evitar que el servidor Node colapse por el bug conocido de RemoteAuth.zip de whatsapp-web.js
process.on('uncaughtException', (err) => {
    console.error('❌ Excepción no capturada (Ignorada para evitar caída):', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});

// Configuraciones de entorno
const PORT = process.env.PORT || 3000;
const FLASK_WEBHOOK_URL = process.env.FLASK_WEBHOOK_URL || 'http://localhost:5000/webhook';
const MONGODB_URI = process.env.MONGODB_URI;

let client;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI no está configurado en el archivo .env');
    process.exit(1);
}

// Conectar a MongoDB y luego iniciar la sesión remota
mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ Conectado a MongoDB');
    const store = new MongoStore({ mongoose: mongoose });

    // Inicializar cliente de WhatsApp con RemoteAuth
    client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            clientId: 'bot-v2', // Forzar una sesión limpia en MongoDB
            backupSyncIntervalMs: 300000 // Guarda la sesión cada 5 min
        }),
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-accelerated-2d-canvas', 
                '--no-first-run', 
                '--no-zygote', 
                '--disable-gpu',
                '--disable-features=site-per-process',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--js-flags="--max_old_space_size=80"',
                '--disk-cache-size=0',
                '--disable-application-cache',
                '--disable-offline-load-stale-cache'
            ]
        }
    });

    // Evento: Generar QR en la terminal
    client.on('qr', (qr) => {
        console.log('\n======================================================');
        console.log('📱 Escanea el siguiente código QR con tu WhatsApp:');
        console.log('======================================================\n');
        qrcode.generate(qr, { small: true });
        
        console.log('\n======================================================');
        console.log('⚠️ ¿El código de arriba se ve roto o deformado?');
        console.log('Copia el siguiente enlace y pégalo en tu navegador web para ver el QR perfectamente claro:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
        console.log('======================================================\n');
    });

    // Evento: Cliente autenticado y listo
    client.on('ready', () => {
        console.log('\n✅ Cliente de WhatsApp listo y autenticado correctamente (Sesión Remota).');
    });

    client.on('remote_session_saved', () => {
        console.log('💾 Sesión de WhatsApp guardada en MongoDB con éxito.');
    });

// Evento: Fallo de autenticación
client.on('auth_failure', msg => {
    console.error('❌ Falla en la autenticación de WhatsApp:', msg);
});

// Evento: Desconexión
client.on('disconnected', (reason) => {
    console.error('❌ Cliente de WhatsApp desconectado. Razón:', reason);
});

// Evento: Escuchar TODOS los mensajes entrantes y salientes (WhatsApp -> Flask)
client.on('message_create', async (msg) => {
    // Si el mensaje fue enviado por el propio usuario, solo procesarlo si se lo envió a sí mismo (chat "Tú")
    if (msg.fromMe && msg.to !== msg.from) {
        return; // Ignorar mensajes enviados por el usuario a otras personas
    }

    try {
        // Extraer la información solicitada
        const messageData = {
            from: msg.from,
            author: msg.author || msg.from,
            body: msg.body || '',
            isGroupMsg: msg.from.includes('@g.us')
        };

        // Manejo de archivos multimedia (Descargar y guardar en local)
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    const folder = path.join(__dirname, 'archivos');
                    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
                    
                    const extension = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
                    const filename = media.filename || `archivo_${Date.now()}.${extension}`;
                    const filePath = path.join(folder, filename);
                    
                    fs.writeFileSync(filePath, media.data, 'base64');
                    messageData.body += `\n[ARCHIVO ADJUNTO RECIBIDO]: ${filename}`;
                    console.log(`📎 Archivo guardado localmente: ${filename}`);
                }
            } catch (err) {
                console.error("❌ Error descargando archivo:", err.message);
            }
        }

        console.log(`\n📩 Mensaje interceptado en chat [${messageData.from}]: ${messageData.body}`);

        // Enviar datos al backend principal (Flask)
        const response = await axios.post(FLASK_WEBHOOK_URL, messageData);
        console.log('✅ Mensaje reenviado a Flask con éxito.');
        
        // Si Flask devuelve un texto de respuesta, enviarlo al chat automáticamente
        if (response.data && response.data.reply) {
            // Verificar si la IA solicitó enviar un archivo junto con la respuesta
            if (response.data.file_to_send) {
                const filePath = path.join(__dirname, 'archivos', response.data.file_to_send);
                if (fs.existsSync(filePath)) {
                    const media = MessageMedia.fromFilePath(filePath);
                    await client.sendMessage(msg.from, media, { caption: response.data.reply });
                    console.log(`📎 Archivo enviado: ${response.data.file_to_send}`);
                } else {
                    await client.sendMessage(msg.from, response.data.reply + "\n[SISTEMA: El archivo solicitado ya no está en el servidor local]");
                }
            } else {
                await client.sendMessage(msg.from, response.data.reply);
            }
            console.log('💬 Respuesta de la IA enviada al WhatsApp.');
        }
        
    } catch (error) {
        // Evitar que el servidor Node colapse si Flask está caído
        console.error('❌ Error al enviar el mensaje a Flask:', error.message);
    }
});

// Endpoint REST: Emisión de mensajes (Flask -> WhatsApp)
app.post('/send-message', async (req, res) => {
    const { chatId, text } = req.body;

    if (!chatId || !text) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: chatId y/o text.' });
    }

    try {
        if (!client) return res.status(500).json({ error: 'El cliente de WhatsApp no está inicializado.' });
        // Enviar el mensaje a través del cliente de WhatsApp
        await client.sendMessage(chatId, text);
        console.log(`\n📤 Mensaje enviado a [${chatId}]: ${text}`);
        
        return res.status(200).json({ success: true, message: 'Mensaje enviado a WhatsApp.' });
    } catch (error) {
        console.error('❌ Error al enviar mensaje por WhatsApp:', error.message);
        return res.status(500).json({ error: 'Error interno al intentar enviar el mensaje.', details: error.message });
    }
});

// Inicializar cliente al final (envuelto dentro de la promesa de mongoose)
    client.initialize();
}).catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message);
});

// Iniciar servidor Express (fuera de Mongo para que Render detecte el puerto)
app.listen(PORT, () => {
    console.log(`🚀 Microservicio Node.js escuchando en el puerto ${PORT}`);
});
