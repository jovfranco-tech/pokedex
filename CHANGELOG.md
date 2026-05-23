# Changelog / Historial de Cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

---

## [15.1.0] - 2026-05-23
### Added
- **Dynamic Connection status indicator (Retro Offline Badge):** Un indicador dinámico visual `OFFLINE` en color rojo retro que notifica en tiempo real si el dispositivo está sin red, justificando los flujos de respuesta y reconocimiento local offline.
- **FOOTNOTE / Disclaimer de Transparencia:** Notas informativas transparentes agregadas al pie del escáner y del chat del asistente para indicar si operan bajo IA Real (OpenAI) o en base a la robusta simulación de base de datos local y IndexedDB offline.
- **SECURITY.md:** Guía de seguridad dedicada que informa de las prácticas de almacenamiento local en el navegador, IndexedDB, manejo seguro de la cámara/micrófono, y directrices para reporte de vulnerabilidades.

### Fixed
- **Fuga de Privacidad de Cámara (Hardeo de Cámara):**
  - Desmontaje del escáner `ImageScanner` al cerrar el chasis de la Pokédex (`isConsoleOpened = false`), lo que interrumpe e inactiva de forma total e incondicional la captura de video del navegador.
  - Parada proactiva del stream de video en cuanto se selecciona o busca un Pokémon.
- **TypeScript y compilación:**
  - Corregido el tipado de `prefersReducedMotion` para que sea un booleano estricto.
  - Corregido la aserción de tipo en `handlePokemonSelected` stub matching de voz.
  - Ajustado `displayName` a `name` para cumplir con las especificaciones de tipo `ScanHistoryEntry`.
  - Añadido `as const` en la estructura `labelPositions` de `sub-components.tsx` para resolver la restricción en la propiedad `textAnchor` de SVG.
  - Corregido el tipo transitorio de spring en `TrainerProfileModal.tsx` con `as const`.
  - Removido la variable local `isSpecialForm` sin uso en `src/services/pokeApi.ts`.
  - Eliminados los duplicados redundantes de `isMega` y `isPrimal` en la assembly offline del Pokémon en `src/services/pokeApi.ts`.
  - Mitigado error de linter por constructores en `pokedexVoice.test.ts` con `void _text`.
- **Linter (ESLint):**
  - Eliminadas las variables de entorno sin uso `stickersEnabled` y `wearTearEnabled` en `App.tsx`.
  - Eliminados catch variables no leídas catch `(e)` y catch `(err)` reemplazándose por `catch` limpios y modernos en todo el proyecto.
  - Removidos imports innecesarios `useEffect` y `User` en `TrainerProfileModal.tsx`.

---

## [15.0.0] - 2026-05-23
### Added
- **Atomic Purple & Jungle Green:** Skins retro translúcidas con circuitos de silicio e hilos de cobre SVG visibles de fondo y efecto de esmerilado blur.
- **Dynamic Holographic Parallax:** Brillo metalizado animado que reacciona en tiempo real según la orientación y traslación cromática matemática.
- **Audio Termo-Analógico (Warm Audio Hum):** Zumbido analógico continuo (60Hz + 120Hz) sintetizado con Web Audio API y clic de descarga magnética térmica al cambiar skins.
- **Hands-Free Active Voice Search:** Botonera manos libres de reconocimiento de voz continua por hotwords de Pokédex.
- **Tarjetas de Entrenador QR Flipping:** Animación de volteo 3D Framer Motion táctil con QR determinista pixelado autocompilado en base a estadísticas.
