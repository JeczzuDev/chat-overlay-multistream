/**
 * Kick Adapter usando WebSocket nativo (FUTURO)
 * Se conectará directamente al WebSocket de Pusher que usa Kick
 * 
 * TODO: Implementar cuando se reverse-engineer el protocolo de Kick
 * Ventajas: Más ligero, sin navegador headless
 * Desventajas: Puede romperse si Kick cambia su infraestructura
 */

class KickWebSocketAdapter {
    constructor(channel, onMessage) {
        this.channel = channel;
        this.onMessage = onMessage;
        this.ws = null;
        this.isRunning = false;
    }

    async start() {
        throw new Error('KickWebSocketAdapter no implementado aún. Use puppeteer-adapter.js');
        
        // TODO: Implementación futura
        // 1. Obtener channelId desde API de Kick
        // 2. Conectar a Pusher WebSocket (wss://ws-us2.pusher.com/app/...)
        // 3. Suscribirse al canal de chat
        // 4. Parsear eventos de mensajes
        // 5. Llamar this.onMessage(messageData)
    }

    async stop() {
        if (this.ws) {
            this.ws.close();
        }
        this.isRunning = false;
    }

    async restart() {
        await this.stop();
        await this.start();
    }
}

module.exports = KickWebSocketAdapter;
