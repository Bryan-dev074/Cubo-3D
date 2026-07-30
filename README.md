# Cubo Mágico 3D

Landing comercial bilingüe (español/portugués) con un cubo 3×3 realmente
jugable. La experiencia permite desordenar, girar capas, deshacer, reiniciar y
resolver una mezcla válida antes de abrir una compra localizada por WhatsApp.

## Requisitos

- Node.js 20.9 o superior
- npm
- Chrome o Chromium para las pruebas de navegador

## Preparación local

```bash
npm ci
npm run dev
```

Abrí `http://localhost:3000`. Para revisar exactamente la versión de producción:

```bash
npm run build
npm run start
```

## Controles

- **Mouse o toque sobre una pieza:** arrastrá para girar su capa.
- **Mouse o toque sobre el fondo:** arrastrá para observar el cubo completo.
- **Desordenar cubo:** genera una secuencia válida de 20 movimientos.
- **Deshacer / Reiniciar:** revierte el último giro o vuelve al estado resuelto.
- **Capas:** abre controles HTML para las nueve capas; funcionan con teclado y
  lectores de pantalla.
- **ES / PT:** cambia todo el texto, los nombres de los movimientos y el mensaje
  de compra sin perder el estado del cubo.

Cuando el visitante resuelve legítimamente la mezcla, aparece una felicitación
breve y el llamado a comprar. Si WebGL no está disponible, la página mantiene
una vista previa, una explicación localizada, reintento y el enlace de compra.

## Arquitectura

- Next.js App Router, React y TypeScript.
- Three.js con React Three Fiber para las 26 piezas independientes.
- Motor de estado puro para movimientos, mezcla, deshacer y detección de
  resolución.
- Escena 3D cargada dinámicamente; el título, la propuesta, los controles y la
  compra permanecen en HTML semántico.
- Diccionarios locales ES/PT, sin servicio externo de traducción.
- Assets sociales y de respaldo generados dentro del proyecto, sin marcas de
  terceros.

El enlace comercial abre WhatsApp al número configurado en
`lib/whatsapp.ts`, con un mensaje cordial y localizado para cada idioma.

## Accesibilidad y adaptación

- Enlace para saltar directamente al cubo.
- Una sola jerarquía principal y controles con nombres accesibles.
- Alternativa completa por teclado para cada capa.
- Objetivos táctiles principales de al menos 44×44 CSS px.
- Respuesta a `prefers-reduced-motion`, `prefers-contrast`,
  `prefers-color-scheme` y `prefers-reduced-transparency`.
- Compra móvil compatible con áreas seguras y telemetría expandible.
- Foco visible, anuncios de estado y recuperación ante fallos de WebGL.

## Validación

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:performance
npm run build
```

Las pruebas unitarias y de componentes cubren el motor, la localización, los
enlaces y los estados comerciales. Playwright recorre la historia completa en
escritorio, 390×844 y 320×700, comprueba gestos reales, teclado, ES/PT,
recuperación sin WebGL, tamaños táctiles, áreas seguras y ausencia de errores de
consola o hidratación.

`npm run test:performance` es un laboratorio Chromium local sobre el servidor
de producción. Falla si el navegador no expone alguna métrica y exige:

- LCP menor a 2500 ms
- CLS menor a 0,1
- duración máxima observada de interacción menor a 200 ms

Estos valores son puertas de laboratorio reproducibles; después de publicar,
los datos de campo de visitantes reales en Vercel son la fuente de producción.

## URL pública y metadatos

Definí una URL absoluta real, sin barra final, en:

```text
NEXT_PUBLIC_SITE_URL=https://tu-dominio-real.com
```

La variable alimenta la URL canónica, Open Graph, `robots.txt` y
`sitemap.xml`. En desarrollo solo se usa `http://localhost:3000` cuando la
variable está ausente o vacía. Un valor explícito inválido, un protocolo
distinto de HTTP(S) o una URL con credenciales falla en cualquier entorno; en
Vercel también falla si la variable falta o apunta a un origen local/loopback.
Así se evitan enlaces inventados y la ocultación accidental de credenciales
dentro del origen.

## Importación directa en Vercel

1. Subí la rama aprobada a GitHub y, desde el panel de Vercel, elegí **Add New →
   Project**.
2. Importá `Bryan-dev074/Cubo-3D`.
3. Conservá el preset detectado **Next.js** y el directorio raíz del repositorio.
4. Agregá `NEXT_PUBLIC_SITE_URL` para Production y Preview con la URL real que
   corresponda a cada entorno.
5. Ejecutá **Deploy**. Luego de confirmar el dominio definitivo, actualizá la
   variable y volvé a desplegar si fuera necesario.

Vercel generará vistas previas para las ramas y producción para la rama
configurada. Este repositorio queda preparado para esa importación, pero **no se
realizó ningún despliegue desde este trabajo**.
