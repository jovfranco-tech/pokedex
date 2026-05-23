# Pokédex Visual

Aplicación web familiar para identificar Pokémon desde una imagen, cámara en vivo, captura o búsqueda por texto. La app consulta PokéAPI, incluye generaciones I-IX y formas Mega/Primigenias, y puede usar IA visual real con OpenAI para reconocer Pokémon desde una imagen y responder preguntas con un chat IA.

El diseño está inspirado en la sensación del Pokédex de Pokopia: interfaz visual, amigable para niños, panel tipo dispositivo, pantalla de escaneo, botones grandes y una ficha principal limpia. La UI actual busca ser más minimalista y moderna, sin perder personalidad de Pokédex.

## Stack

- React + Vite
- Tailwind CSS
- Estado local de React
- `localStorage` para recordar el último resultado
- PokéAPI para Pokédex actual, sprites, datos y sonidos
- Endpoints locales de Vite para IA visual real y chat IA con OpenAI Responses API

## Instalar

```bash
npm install
```

## Correr localmente

```bash
npm run dev
```

Abre la URL que muestra Vite, normalmente:

```text
http://localhost:5174
```

Para abrirla en otra pantalla de la red local:

```bash
npm run dev:lan
```

## Activar IA visual real

La app funciona sin API key usando respaldo local por nombre de archivo. Para reconocimiento visual real:

Opción rápida:

```bash
npm run setup:openai
```

El comando guarda tu clave solo en `.env` dentro de esta carpeta y deja un modelo compartido para visión/chat.

Opción manual:

1. Crea un archivo `.env` basado en `.env.example`.
2. Agrega tu clave y, si quieres, cambia el modelo:

```bash
OPENAI_API_KEY=sk-proj-tu_api_key
OPENAI_MODEL=gpt-5-mini
OPENAI_VISION_MODEL=gpt-5-mini
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_VISION_DETAIL=high
```

3. Reinicia Vite:

```bash
npm run dev
```

Cuando `OPENAI_API_KEY` existe, las imágenes que subas se envían desde tu servidor local a OpenAI para identificar el Pokémon. El chat IA también usa el endpoint local `/api/pokemon-chat`. La clave nunca se envía al navegador.

Puedes usar solo `OPENAI_MODEL` para visión y chat, o separar con `OPENAI_VISION_MODEL` y `OPENAI_CHAT_MODEL`. Si el modelo configurado no está disponible para tu organización, el servidor intenta automáticamente un respaldo compatible (`gpt-4o-mini`) para que la app no se quede bloqueada.

El prompt visual está calibrado para juguetes, cartas, dibujos, screenshots, sprites y arte oficial. La app prioriza evidencia visual como silueta, color, orejas, cola, alas, caparazón, marca facial y pose.

## Cámara móvil con HTTPS local

Algunos navegadores móviles bloquean la cámara cuando abres la app desde `http://TU-IP:5174`. Para probar cámara desde celular con HTTPS:

1. Crea un certificado local:

```bash
npm run cert:local
```

2. En `.env`, activa HTTPS:

```bash
POKEDEX_HTTPS=true
POKEDEX_HTTPS_KEY=certs/localhost-key.pem
POKEDEX_HTTPS_CERT=certs/localhost.pem
```

3. Ejecuta:

```bash
npm run dev:https
```

4. Abre en el celular:

```text
https://TU-IP-LOCAL:5174
```

El navegador puede mostrar una advertencia porque es un certificado local. Para una experiencia perfecta en celular, instala o confía el certificado en el dispositivo.

## Abrir desde celular en la misma red

Vite ya está configurado con `host: "0.0.0.0"` en `vite.config.js`.

1. Conecta la computadora y el celular a la misma red Wi-Fi.
2. Ejecuta:

```bash
npm run dev -- --host 0.0.0.0
```

3. Busca la IP local de tu computadora.

En macOS:

```bash
ipconfig getifaddr en0
```

4. En el celular abre:

```text
http://TU-IP-LOCAL:5174
```

Ejemplo:

```text
http://192.168.1.20:5174
```

## Funcionalidades actuales

- Pantalla principal estilo dispositivo Pokédex inspirado en Pokopia.
- Cámara en vivo con preview para capturar una foto desde el navegador.
- Botones para tomar foto, subir archivo o iniciar un nuevo escaneo.
- Vista previa de la imagen cargada.
- Estado vacío, error y loading con “Escaneando Pokémon...”.
- Identificación visual real con OpenAI Responses API cuando `OPENAI_API_KEY` está configurada.
- Respaldo local por pistas del nombre de archivo si la IA visual no está configurada.
- Búsqueda por texto o número de Pokédex usando el conteo actual de `pokemon-species` en PokéAPI.
- Mega Evoluciones y formas primigenias disponibles en PokéAPI, por ejemplo `Mega Charizard X`, `Mega Mewtwo Y` o `Primal Kyogre`.
- Ficha visual con nombre, número, tipo, confianza, descripción, ataques, habilidades, evolución, altura, peso y sprite, con nombres en español cuando PokéAPI los ofrece.
- Stats base: PS, ataque, defensa, ataque especial, defensa especial y velocidad.
- Vulnerabilidades, resistencias, inmunidades y tipos contra los que es efectivo.
- Sección de juegos donde aparece el Pokémon según PokéAPI.
- Sección animada con GIFs de PokéAPI cuando existen, y fallback visual con profundidad, partículas y movimiento por tipo.
- Escena 2.5D/3D con parallax, sombreado por tipo, capas de profundidad, energía dinámica, luz interactiva y microinteracciones.
- Sonido del Pokémon cuando PokéAPI lo ofrece.
- Chat IA real con OpenAI cuando `OPENAI_API_KEY` está configurada, con respaldo local para preguntas sobre tipo, stats, juegos, ataques, evolución, debilidades, resistencias, fortalezas, altura, peso y sonido.
- Persistencia del último resultado e historial familiar de escaneos con `localStorage`.
- Diseño responsive para computadora y celular.

## Evaluar precisión visual

Incluye un evaluador con 40 imágenes públicas de arte oficial de PokéAPI. Sirve para medir si el endpoint multimodal está identificando bien antes de probar fotos familiares.

Con la app corriendo y `OPENAI_API_KEY` configurada:

```bash
npm run eval:vision -- --limit=40
```

Opciones útiles:

```bash
npm run eval:vision -- --dry-run
npm run eval:vision -- --limit=10 --detail=low
npm run eval:vision -- --base=https://TU-IP-LOCAL:5174 --limit=40
npm run eval:vision -- --photos=./mis-fotos-pokemon --limit=20 --detail=high
```

Para medir casos más parecidos al uso real, hay una suite con cartas y un juguete público, y también acepta una carpeta de fotos tomadas desde celular. Nombra tus archivos con el Pokémon esperado antes de `__`, por ejemplo `pikachu__carta-reflejo.jpg` o `charizard__figura-sala.png`.

```bash
npm run eval:real-world -- --base=https://pokedex-henna-nu-98.vercel.app
npm run eval:real-world -- --photos=./mis-fotos-pokemon --limit=50 --detail=high
```

Para fotos propias, usa nombres con el Pokémon esperado antes de `__`, por ejemplo `pikachu__juguete.jpg` o `charizard__carta.png`.

Los reportes se guardan en `reports/vision-eval-latest.json` y `reports/vision-eval-photos-latest.json`.

## Arquitectura

- `src/components`: componentes visuales reutilizables.
- `src/data/pokemonGen1.js`: catálogo local de favoritos y respaldo.
- `server/openaiVisionApi.js`: endpoints locales `/api/identify-pokemon` y `/api/pokemon-chat` con OpenAI sin exponer la API key.
- `src/services/pokeApi.js`: índice actualizado, búsqueda y detalles desde PokéAPI.
- `src/data/typeChart.js`: tabla de efectividad de tipos para combate.
- `src/services/visionSimulator.js`: orquesta IA visual real y fallback local.
- `src/services/pokemonAssistant.js`: ayudante local de preguntas.
- `src/services/pokemonAiChat.js`: cliente del chat IA real con fallback local.
- `src/components/ScanHistoryStrip.jsx`: historial visual compacto de escaneos recientes.
- `src/hooks`: hooks pequeños para vista previa de imagen y persistencia local.
- `src/styles`: CSS refactorizado por dominio visual para consola, ficha, asistente, animaciones y responsive.
- `scripts/vision-eval-samples.mjs`: evaluación de precisión con 40 imágenes públicas.
- `scripts/create-local-cert.mjs`: certificado local para probar cámara móvil por HTTPS.
- `src/utils`: utilidades compartidas.

## Comandos

```bash
npm install
npm run dev
npm run dev:lan
npm run setup:openai
npm run cert:local
npm run dev:https
npm run eval:vision -- --limit=40
npm run build
npm run preview
```

## Instalador de Windows

Para generar el instalador:

```bash
npm run dist:win
```

El archivo queda en `release/Pokédex IA Setup 1.0.0.exe`. También se genera una versión portable en `release/Pokédex IA 1.0.0.exe`.

Para que Windows no muestre advertencia de SmartScreen necesitas firmar con un certificado real de código. Electron Builder puede usarlo si defines estas variables antes de compilar:

```bash
CSC_LINK=/ruta/a/certificado.pfx
CSC_KEY_PASSWORD=tu_password_del_certificado
npm run dist:win
```

Sin certificado válido, el instalador funciona, pero Windows puede avisar que viene de un editor desconocido.

## Seguridad y Privacidad

La Pokédex IA implementa estrictos controles de seguridad y privacidad siguiendo prácticas **OWASP-lite**:

- **Arquitectura Local-First y Respaldo Local:** Todos tus Pokémon capturados, vistos, historial y favoritos se persisten localmente en el dispositivo mediante `localStorage` con una réplica reactiva asíncrona en una base de datos local **IndexedDB** (`indexedDbBackup.ts`) para garantizar inmunidad contra pérdidas accidentales de datos sin necesidad de registrar cuentas externas.
- **Protección Activa de Privacidad en Cámara:** La cámara web o del móvil requiere consentimiento explícito. Para evitar fugas de privacidad, el stream se apaga automáticamente en cuanto se identifica un Pokémon. Adicionalmente, al cerrar la tapa del chasis físico (`isConsoleOpened = false`), el componente del escáner se **desmonta físicamente del DOM**, deteniendo instantáneamente todos los tracks de medios en ejecución.
- **Transparencia de IA y Fallbacks:** El asistente y el escáner notifican visualmente si el reconocimiento y las respuestas están impulsados por IA real en la nube o por la robusta base de datos y simulación local offline.
- **Hardening de Headers en Vercel:** Configurada con una rigurosa Content-Security-Policy (CSP) y directivas `X-Frame-Options: DENY` en `vercel.json` para bloquear inyecciones de código malicioso y ataques de secuestro de clic (clickjacking).

## Roadmap V2

- Evolución visual del Pokémon.
- Exportar resultado como imagen.
- Reconocimiento de múltiples Pokémon en una sola imagen.
- Voz real para el asistente.
- Evaluación adicional con fotos familiares reales, juguetes, cartas y capturas propias.
- Modelos 3D reales con assets licenciados o propios, si se decide sumar una dependencia 3D.
