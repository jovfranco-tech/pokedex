# Política de Seguridad y Privacidad: Pokédex IA

Este documento describe la arquitectura de seguridad, la política de manejo de datos locales/cámara y las directrices de privacidad de la Pokédex IA desplegada en Vercel.

---

## 1. Arquitectura de Seguridad "Local-First"

Pokédex IA ha sido diseñada bajo una filosofía **Local-First (Local Primero)**. Toda la persistencia de datos ocurre directamente en el dispositivo del usuario:

*   **Colección, Historial y Favoritos:** Se almacenan de forma segura utilizando la API `window.localStorage` en el navegador del usuario.
*   **Respaldo Local Avanzado:** Para prevenir pérdidas accidentales de datos si el navegador decide purgar el caché, la aplicación mantiene una réplica asíncrona de los datos del entrenador en una base de datos local **IndexedDB** (`indexedDbBackup.ts`).
*   **Cero Servidores de Persistencia:** No existe una base de datos centralizada externa ni un sistema de login basado en servidores que recopile información personal del entrenador.

---

## 2. Privacidad de Sensores Físicos (Cámara y Micrófono)

La aplicación utiliza APIs del navegador para acceder a hardware del dispositivo bajo estrictos controles de consentimiento y ciclo de vida de procesos:

### Cámara / Escáner
*   **Permisos:** El permiso de la cámara solo se solicita cuando el usuario hace clic proactivamente en el botón de **Cámara** en el chasis izquierdo.
*   **Manejo de Video de Corto Ciclo (OWASP-Hardened):** 
    *   La transmisión de video se detiene proactivamente en cuanto se detecta o selecciona un Pokémon.
    *   Si el usuario cierra la tapa física del chasis de la Pokédex (`isConsoleOpened` cambia a `false`), el componente del escáner se **desmonta por completo**, lo que cancela de forma inmediata todos los tracks del stream de medios del navegador, apagando la luz de webcam física/virtual del dispositivo.
*   **Simulación de Respaldo Local:** Si las APIs de visión no están disponibles en la nube o no se dispone de conexión de red, la identificación se ejecuta de forma local analizando metadatos locales y el nombre de archivo de la imagen, garantizando un flujo interactivo y sin fugas de datos de cámara hacia el exterior.

### Micrófono / Búsqueda y Chat por Voz
*   **API Utilizada:** Utiliza la API local y nativa del navegador `SpeechRecognition` (Web Speech API) de forma efímera.
*   **Privacidad de Audio:** El audio capturado por el micrófono se procesa localmente en el dispositivo para convertir el habla a texto y no se envía ninguna grabación de audio ni archivo de sonido a APIs externas.

---

## 3. Seguridad de las APIs y hardeo de Vercel

*   **Protección contra Clickjacking y XSS:** La aplicación utiliza headers HTTP estrictos en `vercel.json` para proteger el sitio cuando se sirve públicamente:
    *   `X-Frame-Options: DENY` bloquea completamente la inserción de la Pokédex dentro de iframes maliciosos en otros sitios.
    *   `Content-Security-Policy (CSP)` restringe estrictamente los orígenes de scripts, hojas de estilo, imágenes y conexiones web autorizadas.
*   **Ocultación de Credenciales:** Todas las claves privadas y secretos requeridos por el servicio de OpenAI están alojados como **Variables de Entorno Secretas en Vercel**, impidiendo que se expongan o compilen dentro del bundle de producción del cliente final.

---

## 4. Reportar una Vulnerabilidad

Si encuentras algún problema de seguridad o debilidad de privacidad en este repositorio, por favor repórtalo enviando un correo a:
📧 **jovan.franco.tech@gmail.com**

Por favor, no publiques issues públicos para reportar fallas de seguridad crítica antes de que podamos abordarlas y parchar la aplicación de forma segura.
