import EventEmitter from 'events';
import { Innertube, YTNodes } from 'youtubei.js';

/**
 * YouTube InnerTube Adapter
 * Usa youtube.js para conectar con la API privada de YouTube (InnerTube)
 * Sin límites de cuota, <2s de latencia, soporte completo de badges/emojis
 */
export default class YouTubeInnertubeAdapter extends EventEmitter {
  constructor() {
    super();
    this.livechat = null;
    this.innertube = null;
    this.isConnected = false;
    this.messageCount = 0;
  }

  /**
   * Conectar al chat de YouTube
   * @param {string} videoId - ID del video de YouTube
   */
  async connect(videoId) {
    try {
      console.log(`[YouTube InnerTube] Inicializando cliente para video: ${videoId}`);
      
      // Crear instancia de Innertube
      this.innertube = await Innertube.create();
      
      // Obtener información del video
      const info = await this.innertube.getInfo(videoId);
      
      // Obtener LiveChat
      this.livechat = info.getLiveChat();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Iniciar chat
      this.livechat.start();
      
      this.isConnected = true;
      console.log('[YouTube InnerTube] Cliente iniciado correctamente');
    } catch (error) {
      console.error('[YouTube InnerTube] Error al conectar:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Configurar listeners de eventos de youtube.js
   */
  setupEventListeners() {
    // Evento: Chat iniciado
    this.livechat.on('start', (initialData) => {
      console.log(`[YouTube InnerTube] Chat iniciado - Viewer: ${initialData.viewer_name || 'Guest'}`);
      this.emit('connected');
      
      // Procesar acciones iniciales (mensajes anclados, donaciones top, etc.)
      if (initialData.actions) {
        initialData.actions.forEach(action => {
          this.processAction(action);
        });
      }
    });

    // Evento: Actualización de chat (mensajes nuevos)
    this.livechat.on('chat-update', (action) => {
      this.processAction(action);
    });

    // Evento: Actualización de metadata (vistas, likes, etc.)
    this.livechat.on('metadata-update', (metadata) => {
      // Silenciar logs de metadata completamente
      // No aportan valor en la terminal
    });

    // Evento: Error
    this.livechat.on('error', (error) => {
      console.error('[YouTube InnerTube] Error en live chat:', error);
      this.emit('error', error);
    });

    // Evento: Stream finalizado
    this.livechat.on('end', () => {
      console.log('[YouTube InnerTube] Stream finalizado');
      this.isConnected = false;
      this.emit('disconnected');
    });
  }

  /**
   * Procesar acciones del chat
   * @param {Object} action - Acción de YouTube
   */
  processAction(action) {
    // AddChatItemAction - Mensajes normales
    if (action.is(YTNodes.AddChatItemAction)) {
      const item = action.as(YTNodes.AddChatItemAction).item;
      
      if (!item) return;

      // LiveChatTextMessage - Mensaje de texto normal
      if (item.is(YTNodes.LiveChatTextMessage)) {
        const textMessage = item.as(YTNodes.LiveChatTextMessage);
        this.emitMessage(textMessage);
      }
      
      // LiveChatPaidMessage - Super Chat
      else if (item.is(YTNodes.LiveChatPaidMessage)) {
        const paidMessage = item.as(YTNodes.LiveChatPaidMessage);
        this.emitMessage(paidMessage, true);
      }
      
      // LiveChatPaidSticker - Super Sticker
      else if (item.is(YTNodes.LiveChatPaidSticker)) {
        const paidSticker = item.as(YTNodes.LiveChatPaidSticker);
        this.emitMessage(paidSticker, false, true);
      }
      
      // LiveChatMembershipItem - Membresía nueva
      else if (item.is(YTNodes.LiveChatMembershipItem)) {
        const membershipItem = item.as(YTNodes.LiveChatMembershipItem);
        this.emitMessage(membershipItem);
      }
    }
    
    // AddBannerToLiveChatCommand - Mensaje anclado
    else if (action.is(YTNodes.AddBannerToLiveChatCommand)) {
      console.log('[YouTube InnerTube] Mensaje anclado detectado');
    }
    
    // MarkChatItemAsDeletedAction - Mensaje eliminado
    else if (action.is(YTNodes.MarkChatItemAsDeletedAction)) {
      const deletedAction = action.as(YTNodes.MarkChatItemAsDeletedAction);
      console.log(`[YouTube InnerTube] Mensaje eliminado: ${deletedAction.target_item_id}`);
    }
    
    // MarkChatItemsByAuthorAsDeletedAction - Usuario baneado
    else if (action.is(YTNodes.MarkChatItemsByAuthorAsDeletedAction)) {
      const bannedAction = action.as(YTNodes.MarkChatItemsByAuthorAsDeletedAction);
      console.log(`[YouTube InnerTube] Usuario baneado: ${bannedAction.external_channel_id}`);
    }
  }

  /**
   * Emitir mensaje formateado
   * @param {Object} item - Item de chat de YouTube
   * @param {boolean} isSuperChat - Si es un Super Chat
   * @param {boolean} isSticker - Si es un Super Sticker
   */
  emitMessage(item, isSuperChat = false, isSticker = false) {
    const author = item.author;
    if (!author) return;

    const username = author.name?.toString() || 'Unknown';
    
    // Procesar mensaje con emojis
    let message = '';
    let emojis = [];
    
    if (item.message) {
      // Si el mensaje tiene runs (texto + emojis)
      if (item.message.runs) {
        message = this.processMessageRuns(item.message.runs, emojis);
      } else {
        message = item.message.toString();
      }
    } else if (isSticker) {
      message = '[Sticker]';
    }
    
    // Procesar badges (moderador, verificado, miembro, etc.) con sus imágenes
    const badges = [];
    const badgeImages = [];
    
    if (author.badges && author.badges.length > 0) {
      author.badges.forEach((badge, index) => {
        if (badge.custom_thumbnail && badge.custom_thumbnail.length > 0) {
          console.log(`[DEBUG BADGE ${index}] custom_thumbnail URL: ${badge.custom_thumbnail[0].url}`);
        }
        let badgeType = null;
        let badgeUrl = null;
        
        // Detectar tipo de badge por icon_type
        if (badge.icon_type) {
          const iconType = badge.icon_type.toLowerCase();
          if (iconType.includes('moderator')) {
            badgeType = 'moderator';
          } else if (iconType.includes('verified')) {
            badgeType = 'verified';
          } else if (iconType.includes('owner')) {
            badgeType = 'owner';
          }
        }
        
        // Detectar tipo de badge por tooltip
        if (!badgeType && badge.tooltip) {
          const tooltip = badge.tooltip.toLowerCase();
          if (tooltip.includes('member')) {
            badgeType = 'member';
          } else if (tooltip.includes('moderator')) {
            badgeType = 'moderator';
          } else if (tooltip.includes('verified')) {
            badgeType = 'verified';
          } else if (tooltip.includes('owner')) {
            badgeType = 'owner';
          }
        }
        
        // Obtener URL de la imagen del badge
        // Solo badges de miembros tienen custom_thumbnail con URLs
        // Para badges estándar (owner, moderator, verified), custom_thumbnail está vacío
        if (badge.custom_thumbnail && badge.custom_thumbnail.length > 0 && badge.custom_thumbnail[0].url) {
          badgeUrl = badge.custom_thumbnail[0].url;
        }
        
        if (badgeType) {
          badges.push(badgeType);
          
          // Solo agregar a badgeImages si tiene URL de custom_thumbnail
          // Los badges sin URL usarán las imágenes estándar de server.js
          if (badgeUrl) {
            badgeImages.push({
              type: badgeType,
              url: badgeUrl,
              tooltip: badge.tooltip || badgeType
            });
          }
        }
      });
    }

    // Color del autor (para Super Chats)
    let color = null;
    if (author.name?.runs && author.name.runs[0]?.text_color) {
      color = this.convertYouTubeColor(author.name.runs[0].text_color);
    }

    const messageData = {
      username,
      message,
      platform: 'youtube',
      badges,
      badgeImages,
      color,
      emojis,
      timestamp: item.timestamp || Date.now(),
      isSuperChat,
      isSticker,
      ...(isSuperChat && item.purchase_amount && {
        superChatAmount: item.purchase_amount
      })
    };

    this.messageCount++;
    this.emit('message', messageData);
    
    if (this.messageCount % 10 === 0) {
      console.log(`[YouTube InnerTube] ${this.messageCount} mensajes procesados`);
    }
  }

  /**
   * Procesar runs del mensaje (texto + emojis)
   * @param {Array} runs - Array de TextRun y EmojiRun
   * @param {Array} emojis - Array donde se almacenarán los emojis detectados
   * @returns {string} Mensaje con placeholders para emojis
   */
  processMessageRuns(runs, emojis) {
    let processedMessage = '';
    
    runs.forEach((run) => {
      // EmojiRun - tiene propiedad 'emoji'
      if (run.emoji) {
        const emojiData = run.emoji;
        const emojiUrl = emojiData.image && emojiData.image.length > 0 
          ? emojiData.image[0].url 
          : null;
        
        if (emojiUrl) {
          // Agregar emoji al array
          emojis.push({
            id: emojiData.emoji_id || `emoji_${emojis.length}`,
            url: emojiUrl,
            text: run.text || emojiData.shortcuts?.[0] || '?',
            isCustom: emojiData.is_custom || false
          });
          
          // Usar el texto del emoji en el mensaje
          processedMessage += run.text || emojiData.shortcuts?.[0] || '?';
        } else {
          processedMessage += run.text || '?';
        }
      }
      // TextRun - solo tiene texto
      else {
        processedMessage += run.text || '';
      }
    });
    
    return processedMessage;
  }

  /**
   * Convertir color de YouTube a formato hexadecimal
   * @param {number} youtubeColor - Color en formato YouTube (int32)
   * @returns {string} Color en formato #RRGGBB
   */
  convertYouTubeColor(youtubeColor) {
    if (!youtubeColor) return null;
    
    // YouTube usa formato int32 ARGB
    const hex = (youtubeColor & 0xFFFFFF).toString(16).padStart(6, '0');
    return `#${hex}`;
  }

  /**
   * Aplicar filtro al chat
   * @param {string} filter - 'TOP_CHAT' o 'LIVE_CHAT'
   */
  applyFilter(filter) {
    if (!this.livechat) {
      throw new Error('LiveChat no está inicializado');
    }
    
    this.livechat.applyFilter(filter);
    console.log(`[YouTube InnerTube] Filtro aplicado: ${filter}`);
  }

  /**
   * Enviar mensaje al chat (requiere autenticación)
   * @param {string} text - Texto del mensaje
   */
  async sendMessage(text) {
    if (!this.livechat) {
      throw new Error('LiveChat no está inicializado');
    }
    
    try {
      await this.livechat.sendMessage(text);
      console.log(`[YouTube InnerTube] Mensaje enviado: ${text}`);
    } catch (error) {
      console.error('[YouTube InnerTube] Error al enviar mensaje:', error);
      throw error;
    }
  }

  /**
   * Desconectar del chat
   */
  disconnect() {
    if (this.livechat) {
      this.livechat.stop();
      this.livechat = null;
    }
    
    this.isConnected = false;
    this.innertube = null;
    console.log('[YouTube InnerTube] Desconectado');
  }

  /**
   * Obtener estadísticas del adaptador
   */
  getStats() {
    return {
      connected: this.isConnected,
      messagesProcessed: this.messageCount,
      adapter: 'InnerTube (youtube.js)',
      quotaUsed: 0, // InnerTube no usa cuota de API oficial
      latency: '<2s'
    };
  }
}
