import { Innertube } from 'youtubei.js';

/**
 * Instancia compartida de InnerTube
 * Crear un cliente hace peticiones de red para cachear la configuración del player,
 * así que el adapter y el resolver reutilizan la misma en vez de crear una cada uno.
 */
let innertubePromise = null;

/**
 * Obtener la instancia compartida de Innertube (memoizada)
 * @returns {Promise<Innertube>}
 */
export async function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = Innertube.create().catch(error => {
      // No cachear el fallo: permite reintentar en la siguiente llamada
      innertubePromise = null;
      throw error;
    });
  }

  return innertubePromise;
}
