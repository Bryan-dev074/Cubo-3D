# Cubo Mágico 3D

Landing comercial bilingüe (español/portugués) con un cubo 3×3 realmente
jugable. La experiencia permite desordenar, girar capas, deshacer, reiniciar y
resolver una mezcla válida antes de abrir una compra localizada por WhatsApp.
Una entrada cinematográfica de aproximadamente dos segundos abre el empaque y
deja caer el cubo real sobre la superficie de juego, sin autorrotación posterior.

## Requisitos

- Node.js 20.9 o superior
- npm
- Chrome o Chromium y WebKit para las pruebas de navegador

## Preparación local

```bash
npm ci
npx playwright install chromium webkit
npm run dev
```

Abrí `http://localhost:3000`. Para revisar exactamente la versión de producción:

```bash
npm run build
npm run start
```

## Controles

- **Mouse izquierdo sobre una pieza:** arrastrá para girar su capa. La pieza y
  la capa iniciales conservan el gesto hasta soltar, aunque el puntero cruce
  otras piezas.
- **Mouse izquierdo sobre el fondo:** arrastrá para rotar la vista completa;
  aunque el puntero cruce una pieza, el gesto sigue siendo de órbita y no mueve
  el cubo.
- **Mouse derecho en cualquier punto del escenario:** arrastrá para rotar la
  vista completa. El menú contextual se bloquea solo dentro del escenario 3D.
- **Toque:** arrastrar desde una pieza gira su capa; arrastrar desde el fondo
  rota la vista.
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
- Entrada finita en HTML/CSS y caída del grupo 3D real; al asentarse, el cubo
  queda quieto hasta la próxima interacción.
- Sombra elíptica HTML anclada al escenario: no forma parte del cubo ni de la
  cámara, por lo que permanece fija al rotar la vista o mover una capa.
- Canvas con render bajo demanda y sin autorrotación ni bucles Three.js en
  reposo.
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
- Composición blanca única con contraste reforzado mediante
  `prefers-contrast` y `prefers-reduced-transparency`.
- Respuesta a `prefers-reduced-motion`: omite solapas, caída, cursor
  personalizado y bucles ambientales sin impedir los giros solicitados.
- Cursor contextual solo en escritorio con puntero fino; comunica botones,
  capa disponible, arrastre de capa, órbita y bloqueo sin sustituir al cursor
  nativo en touch.
- Movimiento ambiental sutil que se pausa durante la entrada, gestos, giros,
  celebración, ayuda, pestaña oculta o movimiento reducido.
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
- respuesta máxima del hilo principal a una interacción menor a 200 ms

El artefacto conserva además la duración completa de Event Timing y el retraso
de presentación para diagnóstico. Ese valor no se usa como INP de hardware en
el navegador headless porque SwiftShader puede demorar el frame presentado aun
cuando el hilo principal ya terminó. Estos valores son puertas de laboratorio
reproducibles; después de publicar, se debe confirmar el INP real con GPU y los
datos de campo de visitantes en Vercel como fuente de producción.

## URL pública y metadatos

En Vercel no hace falta configurar un dominio manualmente. El proyecto usa
automáticamente `VERCEL_PROJECT_PRODUCTION_URL`, que corresponde al dominio de
producción asignado por Vercel (`*.vercel.app` cuando no existe un dominio
personalizado). `VERCEL_URL` queda como respaldo para el despliegue generado.

Si más adelante se conecta un dominio propio, se puede definir opcionalmente
una URL absoluta, sin barra final, para darle prioridad:

```text
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

La URL resuelta alimenta la URL canónica, Open Graph, `robots.txt` y
`sitemap.xml`. En desarrollo local se usa `http://localhost:3000` cuando no hay
una URL configurada. Un valor explícito inválido, un protocolo distinto de
HTTP(S), una URL con credenciales o un origen local en Vercel detiene la
compilación para evitar metadatos inseguros.

## Importación directa en Vercel

1. Subí la rama aprobada a GitHub y, desde el panel de Vercel, elegí **Add New →
   Project**.
2. Importá `Bryan-dev074/Cubo-3D`.
3. Conservá el preset detectado **Next.js** y el directorio raíz del repositorio.
4. No agregues ninguna variable de URL: el dominio predeterminado de Vercel se
   detecta automáticamente.
5. Ejecutá **Deploy**.

Si un proyecto antiguo no expone esas variables automáticas, activá
**Settings → Environment Variables → Automatically expose System Environment
Variables** y volvé a desplegar. Esto no requiere comprar ni configurar un
dominio.

Vercel generará vistas previas para las ramas y producción para la rama
configurada. Este repositorio queda preparado para esa importación, pero **no se
realizó ningún despliegue desde este trabajo**.
