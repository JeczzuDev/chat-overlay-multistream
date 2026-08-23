import { getInnertube } from './youtube-innertube-client.js';

/**
 * YouTube Live Resolver
 *
 * Descubre el ID del directo activo de un canal sin API key ni OAuth.
 *
 * Se apoya en que YouTube resuelve la URL /live de forma distinta según el estado:
 *   - Canal EN VIVO   -> watchEndpoint  { videoId: 'xxx' }
 *   - Canal SIN directo -> browseEndpoint { browseId, params } (la pestaña "En vivo")
 *
 * Es decir: la presencia de payload.videoId es el discriminador.
 *
 * Nota: solo funciona con directos PÚBLICOS. Los no listados o privados son
 * invisibles para InnerTube anónimo y requerirían OAuth.
 */

/**
 * Construir la URL /live a partir de un canal en cualquier formato aceptado
 * @param {string} channel - '@handle', 'handle' o un ID 'UCxxxx'
 * @returns {string}
 */
function buildLiveUrl(channel) {
  const trimmed = channel.trim();

  // ID de canal (UC...) usa /channel/, los handles usan /@handle
  const target = /^UC[\w-]{20,}$/.test(trimmed)
    ? `channel/${trimmed}`
    : (trimmed.startsWith('@') ? trimmed : `@${trimmed}`);

  return `https://www.youtube.com/${target}/live`;
}

/**
 * Resolver el ID del directo activo de un canal
 * @param {string} channel - '@handle', 'handle' o 'UCxxxx'
 * @returns {Promise<string|null>} ID del video en vivo, o null si no hay directo
 */
export async function resolveLiveVideoId(channel) {
  if (!channel) return null;

  try {
    const innertube = await getInnertube();
    const endpoint = await innertube.resolveURL(buildLiveUrl(channel));

    // watchEndpoint -> hay directo | browseEndpoint -> no hay
    return endpoint?.payload?.videoId ?? null;
  } catch (error) {
    // Un fallo de red no debe tumbar el sondeo: se trata como "no hay directo"
    console.error(`[YouTube Resolver] Error al resolver el canal ${channel}:`, error.message);
    return null;
  }
}

/**
 * Extraer un ID de video desde una URL de YouTube o desde el ID pelado
 * Acepta: watch?v=ID, youtu.be/ID, /live/ID, /embed/ID o el ID directamente
 * @param {string} input
 * @returns {string|null} ID válido, o null si no se pudo extraer
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // ID pelado: 11 caracteres del alfabeto de YouTube
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /[?&]v=([\w-]{11})/,        // youtube.com/watch?v=ID
    /youtu\.be\/([\w-]{11})/,   // youtu.be/ID
    /\/live\/([\w-]{11})/,      // youtube.com/live/ID
    /\/embed\/([\w-]{11})/      // youtube.com/embed/ID
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}
