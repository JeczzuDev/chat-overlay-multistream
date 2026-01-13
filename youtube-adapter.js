/**
 * YouTube Live Chat Adapter
 * Usa YouTube Data API v3 con HTTP polling para leer mensajes del chat en vivo
 */

class YouTubeAdapter {
    constructor(videoId, apiKey, onMessage) {
        this.videoId = videoId;
        this.apiKey = apiKey;
        this.onMessage = onMessage;
        this.liveChatId = null;
        this.nextPageToken = null;
        this.pollingInterval = null;
        this.isRunning = false;
        this.pollIntervalMs = 3000; // Intervalo inicial de polling (3 segundos)
        this.processedMessageIds = new Set();
        this.maxProcessedIds = 1000; // Límite para evitar memory leak
    }

    /**
     * Obtener el liveChatId del video en vivo
     */
    async getLiveChatId() {
        try {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.videoId}&key=${this.apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'Error al obtener información del video');
            }

            if (!data.items || data.items.length === 0) {
                throw new Error(`Video no encontrado: ${this.videoId}`);
            }

            const video = data.items[0];
            
            if (!video.liveStreamingDetails) {
                throw new Error('Este video no es una transmisión en vivo');
            }

            if (!video.liveStreamingDetails.activeLiveChatId) {
                throw new Error('El chat en vivo no está activo para este video');
            }

            this.liveChatId = video.liveStreamingDetails.activeLiveChatId;
            console.log('🔴 [YOUTUBE] LiveChatId obtenido:', this.liveChatId.substring(0, 20) + '...');
            return this.liveChatId;
        } catch (error) {
            console.error('🔴 [YOUTUBE] Error obteniendo liveChatId:', error.message);
            throw error;
        }
    }

    /**
     * Obtener mensajes del chat
     */
    async fetchMessages() {
        if (!this.liveChatId) return [];

        try {
            let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails&maxResults=200&key=${this.apiKey}`;
            
            if (this.nextPageToken) {
                url += `&pageToken=${this.nextPageToken}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                // Manejar errores específicos
                if (data.error.code === 403 && data.error.errors?.[0]?.reason === 'liveChatEnded') {
                    console.log('🔴 [YOUTUBE] El chat en vivo ha terminado');
                    this.stop();
                    return [];
                }
                throw new Error(data.error.message || 'Error al obtener mensajes');
            }

            // Actualizar token y ajustar intervalo de polling
            this.nextPageToken = data.nextPageToken;
            
            // YouTube nos indica el intervalo óptimo de polling
            if (data.pollingIntervalMillis) {
                this.pollIntervalMs = Math.max(data.pollingIntervalMillis, 2000); // Mínimo 2 segundos
            }

            return data.items || [];
        } catch (error) {
            console.error('🔴 [YOUTUBE] Error fetching messages:', error.message);
            return [];
        }
    }

    /**
     * Procesar un mensaje del chat
     */
    processMessage(item) {
        // Evitar mensajes duplicados
        if (this.processedMessageIds.has(item.id)) {
            return null;
        }

        // Limpiar IDs antiguos si hay demasiados
        if (this.processedMessageIds.size >= this.maxProcessedIds) {
            const idsArray = Array.from(this.processedMessageIds);
            idsArray.slice(0, 500).forEach(id => this.processedMessageIds.delete(id));
        }
        
        this.processedMessageIds.add(item.id);

        const snippet = item.snippet;
        const author = item.authorDetails;

        // Solo procesar mensajes de texto normales
        if (snippet.type !== 'textMessageEvent') {
            // Podemos manejar otros tipos en el futuro (superChat, memberMilestone, etc.)
            return null;
        }

        // Construir array de badges
        const badges = [];
        if (author.isChatOwner) badges.push({ type: 'owner', text: 'Owner' });
        if (author.isChatModerator) badges.push({ type: 'moderator', text: 'Moderator' });
        if (author.isChatSponsor) badges.push({ type: 'member', text: 'Member' });
        if (author.isVerified) badges.push({ type: 'verified', text: 'Verified' });

        return {
            id: item.id,
            username: author.displayName,
            message: snippet.textMessageDetails?.messageText || snippet.displayMessage || '',
            profileImageUrl: author.profileImageUrl,
            badges,
            isChatOwner: author.isChatOwner,
            isModerator: author.isChatModerator,
            isMember: author.isChatSponsor,
            isVerified: author.isVerified,
            publishedAt: snippet.publishedAt
        };
    }

    /**
     * Loop de polling
     */
    async poll() {
        if (!this.isRunning) return;

        try {
            const messages = await this.fetchMessages();
            
            for (const item of messages) {
                const processed = this.processMessage(item);
                if (processed && this.onMessage) {
                    this.onMessage(processed);
                }
            }
        } catch (error) {
            console.error('🔴 [YOUTUBE] Error en polling:', error.message);
        }

        // Programar siguiente poll
        if (this.isRunning) {
            this.pollingInterval = setTimeout(() => this.poll(), this.pollIntervalMs);
        }
    }

    /**
     * Iniciar el adaptador
     */
    async start() {
        console.log(`🔴 [YOUTUBE] Iniciando adaptador para video: ${this.videoId}`);
        
        try {
            await this.getLiveChatId();
            this.isRunning = true;
            
            // Primera carga: obtener mensajes pero no enviarlos (evitar flood inicial)
            console.log('🔴 [YOUTUBE] Cargando historial inicial...');
            await this.fetchMessages();
            
            // Esperar el intervalo indicado por YouTube antes de iniciar polling
            console.log(`🔴 [YOUTUBE] Iniciando polling (intervalo: ${this.pollIntervalMs}ms)...`);
            this.pollingInterval = setTimeout(() => this.poll(), this.pollIntervalMs);
            
            return true;
        } catch (error) {
            console.error('🔴 [YOUTUBE] Error al iniciar:', error.message);
            return false;
        }
    }

    /**
     * Detener el adaptador
     */
    async stop() {
        console.log('🔴 [YOUTUBE] Deteniendo adaptador...');
        this.isRunning = false;
        
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.processedMessageIds.clear();
    }
}

module.exports = YouTubeAdapter;
