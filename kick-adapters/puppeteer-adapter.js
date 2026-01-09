const puppeteer = require('puppeteer');

/**
 * Kick Adapter usando Puppeteer
 * Intercepta WebSocket de Pusher para leer chat en tiempo real
 */
class KickPuppeteerAdapter {
    constructor(channel, onMessage) {
        this.channel = channel;
        this.onMessage = onMessage;
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.cdpSession = null;
    }

    async start() {
        try {
            console.log(`💚 [KICK-PUPPETEER] Iniciando para canal: ${this.channel}`);
            
            // Lanzar navegador headless
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ]
            });

            this.page = await this.browser.newPage();
            
            // Obtener CDP session para interceptar WebSocket
            this.cdpSession = await this.page.createCDPSession();
            await this.cdpSession.send('Network.enable');
            
            // Configurar viewport
            await this.page.setViewport({ width: 1280, height: 720 });
            
            // Interceptar WebSocket antes de navegar
            this.setupWebSocketInterceptor();
            
            // Navegar a Kick
            console.log(`💚 [KICK-PUPPETEER] Navegando a https://kick.com/${this.channel}`);
            await this.page.goto(`https://kick.com/${this.channel}`, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Esperar a que se establezca la conexión WebSocket
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.isRunning = true;
            console.log(`💚 [KICK-PUPPETEER] ¡Conectado y escuchando WebSocket!`);
            
        } catch (error) {
            console.error(`💚 [KICK-PUPPETEER] Error al iniciar:`, error.message);
            await this.stop();
            throw error;
        }
    }

    setupWebSocketInterceptor() {
        // Interceptar frames de WebSocket
        this.cdpSession.on('Network.webSocketFrameReceived', async ({ requestId, timestamp, response }) => {
            if (!this.isRunning) return;
            
            try {
                const payload = response.payloadData;
                
                // Kick usa Pusher, buscar eventos de chat
                if (payload.includes('pusher:') || payload.includes('ChatMessageEvent')) {
                    this.handlePusherMessage(payload);
                }
            } catch (error) {
                console.error(`💚 [KICK-PUPPETEER] Error procesando WebSocket frame:`, error.message);
            }
        });

        console.log(`💚 [KICK-PUPPETEER] WebSocket interceptor configurado`);
    }

    handlePusherMessage(payload) {
        try {
            const data = JSON.parse(payload);
            
            // Pusher event structure: { event: "...", data: "...", channel: "..." }
            if (data.event?.includes('ChatMessageEvent')) {
                const eventData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                
                // Extraer información del mensaje
                const username = eventData.sender?.username || eventData.username || 'Unknown';
                const message = eventData.content || eventData.message || '';
                
                if (!username || !message) return;
                
                // Extraer badges y roles
                const sender = eventData.sender || {};
                const identity = sender.identity || {};
                
                const badges = [];
                const isModerator = identity.badges?.some(b => b.type === 'moderator') || false;
                const isSubscriber = identity.badges?.some(b => b.type === 'subscriber') || false;
                const isVIP = identity.badges?.some(b => b.type === 'vip') || false;
                
                if (identity.badges) {
                    badges.push(...identity.badges.map(b => b.type));
                }
                
                // Extraer emotes de Kick
                const emotes = [];
                const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
                let emoteMatch;
                while ((emoteMatch = emoteRegex.exec(message)) !== null) {
                    emotes.push({
                        id: emoteMatch[1],
                        name: emoteMatch[2]
                    });
                }
                
                const messageData = {
                    username,
                    message,
                    badges,
                    emotes,
                    isModerator,
                    isSubscriber,
                    isVIP,
                    color: identity.color || null,
                    timestamp: Date.now()
                };
                
                if (this.onMessage) {
                    this.onMessage(messageData);
                }
            }
        } catch (error) {
            // Ignorar errores de parsing
            console.error(`💚 [KICK-PUPPETEER] Error parseando mensaje:`, error.message);
        }
    }

    async stop() {
        console.log(`💚 [KICK-PUPPETEER] Cerrando...`);
        this.isRunning = false;
        
        try {
            if (this.cdpSession) {
                await this.cdpSession.detach();
            }
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
        } catch (error) {
            console.error(`💚 [KICK-PUPPETEER] Error al cerrar:`, error.message);
        }
        
        this.cdpSession = null;
        this.page = null;
        this.browser = null;
    }

    async restart() {
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.start();
    }
}

module.exports = KickPuppeteerAdapter;
