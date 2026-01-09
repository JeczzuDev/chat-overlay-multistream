require('dotenv').config();
const express = require('express');
const http = require('node:http');
const WebSocket = require('ws');
const tmi = require('tmi.js');
const path = require('node:path');

// ============================================
// CONFIGURACIÓN
// ============================================
const PORT = process.env.PORT || 3000;
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL || 'jeczzu';
const KICK_CHANNEL = process.env.KICK_CHANNEL || 'jeczzu';
const KICK_ENABLED = process.env.KICK_ENABLED !== 'false';
const KICK_USE_MOCK = process.env.KICK_USE_MOCK === 'true';

// Constantes de historial y mensajes
const MAX_HISTORY = 100;
const MOCK_MESSAGE_MIN_DELAY = 5000; // 5 segundos
const MOCK_MESSAGE_MAX_DELAY = 15000; // 15 segundos
const MOCK_SUBSCRIBER_PROBABILITY = 0.7;

// URLs de emotes
const TWITCH_EMOTE_URL_TEMPLATE = 'https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0';
const KICK_EMOTE_URL_TEMPLATE = 'https://files.kick.com/emotes/{id}/fullsize';

// Colores de plataformas
const PLATFORM_COLORS = {
    twitch: '#9146FF',
    kick: '#53FC18'
};

// Colores aleatorios para usuarios
const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

// ============================================
// SERVIDOR EXPRESS + WEBSOCKET
// ============================================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos (overlay)
app.use(express.static(path.join(__dirname, 'public')));

// Clientes WebSocket conectados
const clients = new Set();

// Historial de mensajes
const messageHistory = [];

wss.on('connection', (ws) => {
    console.log('🔌 Cliente conectado al WebSocket');
    clients.add(ws);
    
    // Enviar historial de mensajes al nuevo cliente
    if (messageHistory.length > 0) {
        console.log(`📜 Enviando ${messageHistory.length} mensajes del historial`);
        messageHistory.forEach(msg => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        });
    }
    
    ws.on('close', () => {
        console.log('🔌 Cliente desconectado');
        clients.delete(ws);
    });
});

// ============================================
// FORMATO UNIFICADO DE MENSAJES
// ============================================

/**
 * Parsear emotes de Twitch usando tags.emotes de tmi.js
 * @param {string} text - Texto del mensaje
 * @param {object} emotesTag - Objeto emotes de tmi.js (formato: { "25": ["0-4"], "555555555": ["6-10"] })
 * @returns {Array<{type: 'text'|'emote', text?: string, id?: string, name?: string, platform?: string, url?: string}>}
 */
function parseTwitchEmotes(text, emotesTag) {
    if (!emotesTag || Object.keys(emotesTag).length === 0) {
        return [{ type: 'text', text }];
    }

    // Crear array de posiciones de emotes
    const emotePositions = [];
    for (const [id, positions] of Object.entries(emotesTag)) {
        for (const pos of positions) {
            const [start, end] = pos.split('-').map(Number);
            emotePositions.push({
                start,
                end,
                id,
                name: text.substring(start, end + 1)
            });
        }
    }

    // Ordenar por posición
    emotePositions.sort((a, b) => a.start - b.start);

    // Construir parts
    const parts = [];
    let lastIndex = 0;

    for (const emote of emotePositions) {
        // Agregar texto antes del emote
        if (emote.start > lastIndex) {
            const textBefore = text.substring(lastIndex, emote.start);
            if (textBefore) {
                parts.push({ type: 'text', text: textBefore });
            }
        }

        // Agregar emote
        parts.push({
            type: 'emote',
            id: emote.id,
            name: emote.name,
            platform: 'twitch',
            url: TWITCH_EMOTE_URL_TEMPLATE.replace('{id}', emote.id)
        });

        lastIndex = emote.end + 1;
    }

    // Agregar texto restante
    if (lastIndex < text.length) {
        const textAfter = text.substring(lastIndex);
        if (textAfter) {
            parts.push({ type: 'text', text: textAfter });
        }
    }

    return parts;
}

/**
 * Parsear emotes de Kick (formato [emote:id:name])
 * @param {string} text - Texto del mensaje
 * @param {Array} kickEmotes - Array de emotes detectados por el adapter
 * @returns {Array<{type: 'text'|'emote', text?: string, id?: string, name?: string, platform?: string, url?: string}>}
 */
function parseKickEmotes(text, kickEmotes = []) {
    if (!kickEmotes || kickEmotes.length === 0) {
        return [{ type: 'text', text }];
    }

    const parts = [];
    let currentIndex = 0;

    // Buscar patrones [emote:id:name]
    const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
    let match;

    while ((match = emoteRegex.exec(text)) !== null) {
        // Agregar texto antes del emote
        if (match.index > currentIndex) {
            const textBefore = text.substring(currentIndex, match.index);
            if (textBefore) {
                parts.push({ type: 'text', text: textBefore });
            }
        }

        // Agregar emote
        const emoteId = match[1];
        const emoteName = match[2];
        parts.push({
            type: 'emote',
            id: emoteId,
            name: emoteName,
            platform: 'kick',
            url: KICK_EMOTE_URL_TEMPLATE.replace('{id}', emoteId)
        });

        currentIndex = match.index + match[0].length;
    }

    // Agregar texto restante
    if (currentIndex < text.length) {
        const textAfter = text.substring(currentIndex);
        if (textAfter) {
            parts.push({ type: 'text', text: textAfter });
        }
    }

    return parts;
}

function createUnifiedMessage(platform, username, message, extra = {}) {
    // Parsear emotes según la plataforma
    let parts = [];
    if (platform === 'twitch' && extra.emotes) {
        parts = parseTwitchEmotes(message, extra.emotes);
    } else if (platform === 'kick' && extra.kickEmotes) {
        parts = parseKickEmotes(message, extra.kickEmotes);
    } else {
        parts = [{ type: 'text', text: message }];
    }

    return {
        id: `${platform}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        platform,
        username,
        raw: message,
        parts,
        timestamp: new Date().toISOString(),
        color: extra.color || getRandomColor(),
        badges: extra.badges || [],
        isSubscriber: extra.isSubscriber || false,
        isModerator: extra.isModerator || false,
        isVIP: extra.isVIP || false
    };
}

function getRandomColor() {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// Enviar mensaje a todos los clientes
function broadcast(message) {
    // Agregar al historial
    messageHistory.push(message);
    
    // Mantener solo los últimos MAX_HISTORY mensajes
    if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
    }
    
    // Broadcast a clientes conectados
    const data = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// ============================================
// CLIENTE TWITCH (tmi.js)
// ============================================
const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: {
        secure: true,
        reconnect: true
    },
    channels: [TWITCH_CHANNEL]
});

twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    
    const unifiedMessage = createUnifiedMessage('twitch', tags['display-name'] || tags.username, message, {
        color: tags.color,
        badges: Object.keys(tags.badges || {}),
        emotes: tags.emotes,
        isSubscriber: tags.subscriber,
        isModerator: tags.mod,
        isVIP: tags.vip
    });
    
    console.log(`💜 [TWITCH] ${unifiedMessage.username}: ${message}`);
    broadcast(unifiedMessage);
});

twitchClient.on('connected', () => {
    console.log(`💜 Conectado a Twitch: #${TWITCH_CHANNEL}`);
});

twitchClient.on('disconnected', (reason) => {
    console.log(`💜 Desconectado de Twitch: ${reason}`);
});

// ============================================
// CLIENTE KICK (Adapter System)
// ============================================
let kickClient = null;

if (KICK_ENABLED) {
    if (KICK_USE_MOCK) {
        // Usar mock para desarrollo
        console.log('💚 Usando Kick Mock Adapter');
        
        class KickMockClient {
            constructor(channel) {
                this.channel = channel;
                this.isRunning = false;
                this.mockUsers = [
                    { username: 'KickUser1', color: PLATFORM_COLORS.kick },
                    { username: 'StreamFan', color: PLATFORM_COLORS.kick },
                    { username: 'ChatViewer', color: PLATFORM_COLORS.kick },
                    { username: 'KickSupporter', color: PLATFORM_COLORS.kick },
                    { username: 'GreenGamer', color: PLATFORM_COLORS.kick }
                ];
                this.mockMessages = [
                    '¡Hola desde Kick! 👋',
                    'Qué buen stream!',
                    'GGWP',
                    'Saludos desde Kick 💚',
                    'POG',
                    'Increíble jugada!',
                    '¿Cuánto llevas streameando?',
                    'Primera vez aquí, me gusta!',
                    'LOL',
                    'Kick > Todo'
                ];
            }
            
            async start() {
                this.isRunning = true;
                console.log(`💚 Kick Mock iniciado para: #${this.channel}`);
                this.simulateMessages();
            }
            
            async stop() {
                this.isRunning = false;
            }
            
            simulateMessages() {
                if (!this.isRunning) return;
                
                const randomUser = this.mockUsers[Math.floor(Math.random() * this.mockUsers.length)];
                const randomMessage = this.mockMessages[Math.floor(Math.random() * this.mockMessages.length)];
                
                const unifiedMessage = createUnifiedMessage('kick', randomUser.username, randomMessage, {
                    color: randomUser.color,
                    badges: ['kick'],
                    isSubscriber: Math.random() > MOCK_SUBSCRIBER_PROBABILITY
                });
                
                console.log(`💚 [KICK-MOCK] ${unifiedMessage.username}: ${randomMessage}`);
                broadcast(unifiedMessage);
                
                const delay = MOCK_MESSAGE_MIN_DELAY + Math.random() * (MOCK_MESSAGE_MAX_DELAY - MOCK_MESSAGE_MIN_DELAY);
                setTimeout(() => this.simulateMessages(), delay);
            }
        }
        
        kickClient = new KickMockClient(KICK_CHANNEL);
        
    } else {
        // Usar Puppeteer adapter real
        console.log('💚 Usando Kick Puppeteer Adapter');
        const KickPuppeteerAdapter = require('./kick-adapters/puppeteer-adapter');
        
        kickClient = new KickPuppeteerAdapter(KICK_CHANNEL, (messageData) => {
            const unifiedMessage = createUnifiedMessage('kick', messageData.username, messageData.message, {
                color: messageData.color || PLATFORM_COLORS.kick,
                badges: messageData.badges,
                kickEmotes: messageData.emotes,
                isSubscriber: messageData.isSubscriber,
                isModerator: messageData.isModerator,
                isVIP: messageData.isVIP
            });
            
            console.log(`💚 [KICK] ${unifiedMessage.username}: ${messageData.message}`);
            broadcast(unifiedMessage);
        });
    }
} else {
    console.log('💚 Kick deshabilitado');
}

// ============================================
// INICIAR SERVIDOR
// ============================================
server.listen(PORT, async () => {
    console.log('═══════════════════════════════════════════');
    console.log('   🎮 CHAT OVERLAY MULTISTREAM');
    console.log('═══════════════════════════════════════════');
    console.log(`📡 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`🖼️  Overlay URL: http://localhost:${PORT}/overlay.html`);
    console.log('═══════════════════════════════════════════');
    
    // Conectar a Twitch
    twitchClient.connect().catch(console.error);
    
    // Iniciar Kick (si está habilitado)
    if (kickClient) {
        try {
            await kickClient.start();
        } catch (error) {
            console.error('💚 Error al iniciar Kick:', error.message);
        }
    }
});

// ============================================
// MANEJO DE CIERRE
// ============================================
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    
    if (kickClient) {
        await kickClient.stop();
    }
    
    twitchClient.disconnect();
    server.close();
    process.exit(0);
});
