# Chat Overlay Multistream

Bridge en Node.js que unifica el chat de **Twitch**, **Kick** y **YouTube Live** en un overlay HTML para OBS.

![Twitch](https://img.shields.io/badge/Twitch-9146FF?style=flat&logo=twitch&logoColor=white)
![Kick](https://img.shields.io/badge/Kick-53FC18?style=flat&logo=kick&logoColor=black)
![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)

## ✨ Características

- 💜 **Twitch**: Conexión via `tmi.js` con badges oficiales (API Helix)
- 💚 **Kick**: Conexión via Puppeteer headless con badges SVG
- 🔴 **YouTube Live**: Conexión via `youtube.js` (InnerTube API) - **Sin límites de cuota**
- Sistema de adaptadores intercambiables
- Mock de Kick opcional para desarrollo
- Mensajes unificados en formato común
- WebSocket para comunicación en tiempo real
- Overlay HTML listo para OBS, con pausa al pasar el cursor sobre un mensaje
- Borrado de mensajes propagado a todos los clientes (también al overlay de OBS)
- Renderizado de emotes de Twitch, Kick y YouTube
- Badges oficiales con imágenes para las 3 plataformas (incluyendo badges personalizadas de YouTube)
- Auto-reconexión en caso de desconexión
- Historial de mensajes persistente

## Instalación

### 1. Clonar o descargar el proyecto

### 2. Instalar dependencias

```bash
npm install
```

**Nota:** Puppeteer descargará automáticamente Chromium (~300MB). Esto puede tardar unos minutos.

### 3. Configurar variables de entorno
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus canales:
   ```env
   TWITCH_CHANNEL=tu_canal
   KICK_CHANNEL=tu_canal
   KICK_ENABLED=true
   KICK_USE_MOCK=false
   ```

### 4. (Opcional) Configurar badges de Twitch

Para mostrar las badges oficiales de Twitch (broadcaster, mod, sub, etc.), necesitas credenciales de la API:

1. Ve a [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Inicia sesión con tu cuenta de Twitch
3. Haz clic en "Register Your Application"
4. Completa el formulario:
   - **Nombre:** Chat Overlay (o el que prefieras)
   - **OAuth Redirect URLs:** `http://localhost:3000`
   - **Category:** Chat Bot
5. Haz clic en "Create"
6. En tu aplicación, copia el **Client ID**
7. Haz clic en "New Secret" para generar el **Client Secret**
8. Agrega ambos valores a tu archivo `.env`:
   ```env
   TWITCH_CLIENT_ID=tu_client_id
   TWITCH_CLIENT_SECRET=tu_client_secret
   ```

> **Nota:** Sin estas credenciales, el overlay funcionará pero mostrará badges de texto (MOD, SUB, VIP) en lugar de las imágenes oficiales.

### 5. Configurar YouTube Live

Para mostrar mensajes de YouTube Live, el proyecto usa `youtube.js` (InnerTube API) que **NO requiere API Key** ni tiene límites de cuota.

Basta con indicar tu canal: el servidor **detecta solo el ID del directo** cuando sales al aire.

```env
YOUTUBE_ENABLED=true
YOUTUBE_CHANNEL=@tu_canal
YOUTUBE_VIDEO_ID=
```

**Cómo funciona la autodetección:**

1. Al arrancar, el servidor resuelve `youtube.com/@tu_canal/live`.
2. Si estás en directo, engancha el chat al instante.
3. Si no, sondea cada 90 s hasta que el directo empiece, y entonces conecta solo.
4. Una vez conectado, deja de sondear.

> ⚠️ **El directo debe ser PÚBLICO.** Los directos no listados o privados son invisibles para InnerTube anónimo; esos sí requerirían OAuth. Si programas el directo en Studio, basta con que sea público al salir al aire.

> **Override manual:** si rellenas `YOUTUBE_VIDEO_ID` se salta la autodetección y conecta a ese video. Es el código después de `watch?v=` en la URL: para `https://www.youtube.com/watch?v=dQw4w9WgXcQ` el ID es `dQw4w9WgXcQ`. Déjalo vacío para autodetectar.

> ✅ **Sin límites de cuota:** YouTube InnerTube es la API privada que usa YouTube internamente. No consume cuota de YouTube Data API v3.

**Control sin reiniciar el servidor:**

```bash
# Ver el estado actual
curl http://localhost:3000/api/youtube/status

# Forzar un video (acepta ID o URL completa)
curl -X POST http://localhost:3000/api/youtube/video \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Re-escanear el canal (body vacío) — útil para enganchar un segundo directo
curl -X POST http://localhost:3000/api/youtube/video \
  -H "Content-Type: application/json" -d '{}'
```

> **Nota:** al terminar un directo, el servidor no vuelve a sondear solo. Para enganchar el siguiente, usa el re-escaneo de arriba o reinicia.

### 6. Iniciar el servidor

**Opción 1: Manual (npm)**

```bash
npm start
```

**Opción 2: Scripts rápidos (recomendado)**

| Script | Descripción | Uso |
|--------|-------------|-----|
| `start-server.bat` | Solo servidor | Doble clic |
| `start-server.ps1` | Solo servidor (PowerShell) | `.\start-server.ps1` |
| `start-with-obs.bat` | Servidor + OBS automático | Doble clic |

Los scripts verifican Node.js, instalan dependencias si faltan, e inician el servidor.

**Opción 3: Inicio automático con Windows**

1. `Win + R` → `shell:startup` → Enter
2. Arrastra `start-with-obs.bat` para crear acceso directo
3. El servidor iniciará con Windows

## Scripts de Inicio

### `start-server.bat` / `start-server.ps1`
Inicia solo el servidor de chat overlay.

**Características:**

- Verifica si Node.js está instalado
- Instala dependencias automáticamente si faltan
- Inicia servidor en `http://localhost:3000`
- Muestra errores si algo falla

**Uso:**
```bash
# Windows CMD
start-server.bat

# PowerShell
.\start-server.ps1
```

### `start-with-obs.bat`

Inicia el servidor Y abre OBS automáticamente.

**Características:**

- Inicia servidor en segundo plano (ventana minimizada)
- Detecta OBS en rutas comunes de instalación
- Espera 3 segundos para que el servidor esté listo
- Abre OBS automáticamente

**Uso:**
```bash
start-with-obs.bat
```

**Detener servidor:** Cierra la ventana "Chat Overlay Server" desde la barra de tareas.

### Inicio Automático (Opcional)

Para que el servidor inicie con Windows:

1. Presiona `Win + R`
2. Escribe `shell:startup` y presiona Enter
3. Crea un acceso directo a:
   - `start-with-obs.bat` (servidor + OBS)
   - `start-server.bat` (solo servidor)
4. Reinicia y el script se ejecutará automáticamente

## Configuración en OBS

1. Inicia el servidor con `npm start`
2. En OBS, añade una nueva fuente: **Navegador (Browser)**
3. Configura:
   - **URL**: `http://localhost:3000/overlay.html`
   - **Ancho**: 400-600px (recomendado)
   - **Alto**: 600-800px (recomendado)
   - **CSS personalizado**: (dejar vacío o añadir ajustes)
4. ¡Listo! El chat aparecerá en tu stream

## Estructura del Proyecto

```
chat-overlay-multistream/
├── .env                              # Configuración
├── .env.example                      # Template de config
├── .gitignore                        
├── package.json                      # Dependencias de producción
├── package-lock.json
├── README.md                         # Este archivo
├── MEJORAS_FUTURAS.md                # Roadmap de mejoras
├── server.js                         # Servidor principal
├── start-server.bat                  # Scripts de inicio
├── start-server.ps1
├── start-with-obs.bat
│   youtube-innertube-adapter.js      # Adaptador YouTube (InnerTube)
│
├── public/                           # Frontend
│   ├── overlay.html
│   ├── overlay.css
│   ├── overlay.js
│   └── icons/                        # Iconos de plataformas
│       ├── twitch.png
│       ├── kick.png
│       └── youtube.png
│
├── kick-adapters/                    # Sistema de adaptadores de Kick
│   ├── kick-puppeteer-adapter.js     # Adapter con Puppeteer (producción)
│   ├── kick-ws-adapter.js            # Adapter WebSocket (experimental)
│   └── kick-mock-adapter.js          # Adapter Mock (testing)
```

## Seguridad y Git

### Archivos que NO debes subir a Git

El `.gitignore` ya está configurado para proteger:

- **`.env`** - Contiene tus canales y credenciales
- **`node_modules/`** - Dependencias (se reinstalan con `npm install`)
- **`.cache/` y `.local-chromium/`** - Cache de Puppeteer
- **Logs y temporales** - `*.log`, `tmp/`, etc.

### Seguro para subir a Git

- Scripts de inicio (`.bat`, `.ps1`)
- `.env.example` (sin datos reales)
- Todo el código fuente
- Documentación y README

### Antes de tu primer commit

```bash
# Verificar que .env no será incluido
git status

# Si ves .env en la lista, NO HAGAS COMMIT
# Asegúrate de que .gitignore está configurado correctamente
```

## Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `TWITCH_CHANNEL` | Canal de Twitch | `jeczzu` |
| `TWITCH_CLIENT_ID` | Client ID de Twitch API | - |
| `TWITCH_CLIENT_SECRET` | Client Secret de Twitch API | - |
| `KICK_CHANNEL` | Canal de Kick | `jeczzu` |
| `KICK_ENABLED` | Activar/desactivar Kick | `true` |
| `KICK_USE_MOCK` | Usar mock en vez de Puppeteer | `false` |
| `YOUTUBE_ENABLED` | Activar/desactivar YouTube | `false` |
| `YOUTUBE_CHANNEL` | Canal del que autodetectar el directo (`@handle` o `UCxxxx`) | - |
| `YOUTUBE_VIDEO_ID` | Override manual del video. Vacío = autodetectar por canal | - |

### Parámetros de URL del overlay

El comportamiento se ajusta desde la propia URL, sin tocar código:

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `pausable` | `true` | Pausa del chat al pasar el cursor sobre un mensaje o scrollear hacia arriba. `?pausable=false` la desactiva |
| `persist` | `false` | Mantiene el historial completo (100 mensajes, sin caducidad) en vez del modo transitorio (15 mensajes, 60 s) |

```
http://localhost:3000/overlay.html                      # por defecto
http://localhost:3000/overlay.html?persist=true         # historial completo
http://localhost:3000/overlay.html?pausable=false       # sin pausa (recomendado en OBS)
```

### Pausar el chat

| Acción | Efecto |
|--------|--------|
| **Cursor sobre un mensaje** | Lo resalta con borde blanco y pausa. Al retirar el cursor, **reanuda solo** |
| **Click en un mensaje** | Lo selecciona: pausa fija que no se suelta al mover el cursor |
| **Scroll hacia arriba** | Pausa. Volver al final reanuda |

Mientras está pausado:

- No se borra ningún mensaje, ni por límite de cantidad ni por caducidad.
- El reloj de caducidad se detiene: al reanudar, los mensajes recuperan el tiempo que estuvieron congelados.
- Una barra **debajo** de la lista (nunca encima) muestra el estado y las acciones disponibles.

La barra reserva su hueco siempre, para que al pausar la lista no se desplace bajo el cursor.

> En OBS no hay cursor ni scroll, así que la pausa no se dispara aunque esté activada. Con `?pausable=false` la barra ni siquiera ocupa espacio.

### Borrar mensajes

Para quitar un mensaje de la pantalla: **click en el mensaje** → botón **🗑 Borrar** de la barra inferior.

El borrado va al servidor, que lo saca del historial y avisa a todos los clientes conectados. Es decir:

- Desaparece a la vez en el navegador **y en el overlay de OBS**.
- No vuelve a aparecer al refrescar.

> ⚠️ El borrado es inmediato y **no se puede deshacer**.

También se puede borrar por API:

```bash
curl -X DELETE http://localhost:3000/api/messages/<id-del-mensaje>
```

| Endpoint | Respuesta |
|----------|-----------|
| `DELETE /api/messages/:id` | `200` con `{ok:true, id}`, o `404` si el mensaje ya no está en el historial |

### Personalizar el Overlay

Edita `public/overlay.html` para ajustar:

- `MAX_MESSAGES_TRANSIENT` / `MAX_MESSAGES_PERSIST`: mensajes visibles según el modo (15 / 100)
- `MAX_MESSAGES_PAUSED`: tope de acumulación mientras el chat está pausado (default: 300)
- `MESSAGE_LIFETIME_MS`: tiempo antes de auto-eliminar mensajes (default: 60000 ms)
- `--msg-bg-alpha` y `--msg-border-alpha` en `:root`: opacidad del fondo del mensaje y del borde de plataforma (default: `0.85`)
- Colores y estilos CSS

## API WebSocket

El servidor envía mensajes en formato JSON:

```json
{
  "id": "twitch-1234567890-abc123",
  "platform": "twitch",
  "username": "Usuario",
  "message": "Hola mundo!",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "color": "#FF6B6B",
  "badges": ["subscriber"],
  "isSubscriber": true,
  "isModerator": false,
  "isVIP": false
}
```

## Notas sobre YouTube Live

### Solución Actual: youtube.js (InnerTube API)

El proyecto usa la librería `youtube.js` que accede a la **InnerTube API** (API privada de YouTube).

**Ventajas:**
- ✅ **Sin cuota:** No consume YouTube Data API v3
- ✅ **Sin API Key:** No necesitas credenciales de Google Cloud
- ✅ **Estable:** Mantenida activamente por la comunidad
- ✅ **Completa:** Badges personalizadas, emojis, verificaciones
- ✅ **Latencia aceptable:** ~5-10 segundos
- ✅ **Autodetección:** Encuentra el ID del directo a partir del canal

**Configuración:**
```env
YOUTUBE_ENABLED=true
YOUTUBE_CHANNEL=@tu_canal
YOUTUBE_VIDEO_ID=
```

**Cómo se autodetecta el directo:** `resolveURL()` sobre `youtube.com/@canal/live` devuelve un
`watchEndpoint` con el `videoId` cuando el canal está emitiendo, y un `browseEndpoint`
(la pestaña "En vivo") cuando no lo está. Esa diferencia es el detector, y no cuesta cuota.
Ver `youtube-live-resolver.js`.

## Disclaimer
This project is not affiliated with, endorsed, or sponsored by YouTube or any of its affiliates or subsidiaries. All trademarks, logos, and brand names used in this project are the property of their respective owners and are used solely to describe the services provided.

As such, any usage of trademarks to refer to such services is considered nominative use. If you have any questions or concerns, please contact me.

---

### Sistema de Adaptadores

El proyecto usa un **sistema de adaptadores intercambiables** para Kick:

```
kick-adapters/
├── puppeteer-adapter.js   ← Implementación actual (Puppeteer headless)
└── ws-adapter.js          ← Futuro (WebSocket nativo de Kick)
```

### Adapter Actual: Puppeteer

- Confiable: Simula un navegador real
- Completo: Captura todos los elementos del chat
- Recursos: ~300MB de Chromium + uso de RAM
- Inicio: Tarda 5-10 segundos en conectar

### Adapter Futuro: WebSocket

- Ligero: Sin navegador, conexión directa
- Rápido: Conexión instantánea
- Inestable: Puede romperse si Kick cambia su infraestructura
- Estado: Pendiente de implementar

### Modo Mock (Desarrollo)

Para testing sin consumir recursos, usa:
```env
KICK_USE_MOCK=true
```

Esto simula mensajes aleatorios sin abrir Kick real.

## Contribuir

Las contribuciones son bienvenidas. Para mejorar el proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-feature`)
3. Haz commit de tus cambios (`git commit -m 'Agregar nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

### Estructura de Branches
- `main` - Código de producción estable
- `develop` - Desarrollo activo
- `feature/*` - Nuevas características
- `fix/*` - Correcciones de bugs

---

## 📊 Estado del Proyecto

✅ **Producción Ready** - Todas las plataformas funcionando:
- 💜 Twitch: Estable con `tmi.js`
- 💚 Kick: Estable con Puppeteer
- 🔴 YouTube: Estable con `youtube.js` (InnerTube)

**Última actualización:** Enero 2026  
**Versión:** 1.0.0 (Limpia - Sin código legacy)

## Licencia

MIT License - Usa este proyecto como quieras.

---

Hecho con ❤️ para streamers multiplatform

<p align="right">
(<a href="#top">back to top</a>)
</p>