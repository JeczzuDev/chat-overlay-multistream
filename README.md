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
- Overlay HTML listo para OBS con scroll pausable
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

Simplemente configura en tu `.env`:
```env
YOUTUBE_ENABLED=true
YOUTUBE_VIDEO_ID=id_del_video_en_vivo
```

> **Nota:** El `YOUTUBE_VIDEO_ID` es el código que aparece en la URL después de `watch?v=`. Por ejemplo, si la URL es `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, el ID es `dQw4w9WgXcQ`.

> ✅ **Sin límites de cuota:** YouTube InnerTube es la API privada que usa YouTube internamente. No consume cuota de YouTube Data API v3.

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
| `YOUTUBE_VIDEO_ID` | ID del video en vivo | - |

### Personalizar el Overlay

Edita `public/overlay.html` para ajustar:

- `MAX_MESSAGES`: Número máximo de mensajes visibles (default: 15)
- `MESSAGE_LIFETIME`: Tiempo antes de auto-eliminar mensajes (default: 60000ms)
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

**Configuración:**
```env
YOUTUBE_ENABLED=true
YOUTUBE_VIDEO_ID=tu_video_id
```

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