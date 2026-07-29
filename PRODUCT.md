# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas hispanohablantes o lusófonas que están evaluando comprar un cubo mágico y quieren experimentar primero, desde computadora o celular, cómo se siente girar, desordenar y resolver un cubo 3×3.

## Product Purpose

Vender un cubo mágico físico mediante una demostración 3D jugable. La experiencia debe convertir curiosidad en intención de compra: el visitante puede explorar el cubo, aceptar el reto de desordenarlo, resolverlo y continuar la conversación comercial por WhatsApp.

## Positioning

La página no presenta el producto con una animación decorativa: convierte el propio cubo en una demostración interactiva y en el centro del recorrido de compra.

## Operating Context

- Navegadores modernos en computadora y celular.
- Interacción directa con mouse, gestos táctiles y controles accesibles equivalentes.
- Compra asistida mediante WhatsApp al número `+595982064334`.
- Hospedaje final previsto en Vercel.

## Capabilities and Constraints

- Cubo mágico 3×3 construido con piezas independientes.
- Rotación libre del cubo completo.
- Selección y giro individual de filas, columnas y capas.
- Controles naturales con mouse y touch, con respuesta visual inmediata.
- Acción explícita para desordenar el cubo.
- Detección real del estado resuelto, no una celebración basada solamente en tiempo o número de movimientos.
- Animación de felicitación al resolverlo y CTA de compra contextual.
- CTA de compra siempre disponible y CTA reforzado después de completar el reto.
- Todos los CTA comerciales deben abrir `wa.me/595982064334` con un mensaje bien redactado, en el idioma activo y con emojis moderados.
- Toda la experiencia debe estar disponible en español y portugués.
- El idioma inicial se detectará desde el navegador, con español como respaldo, y la elección manual se conservará localmente.
- Los textos, nombres accesibles, mensajes de estado, celebración y mensaje precargado de WhatsApp deben respetar el idioma activo.
- Diseño responsive, rápido y cómodo en computadora y celular.
- Sin backend, cuenta, carrito ni pago integrado en esta versión.

## Brand Commitments

- Nombre visible principal: “Cubo Mágico 3D”.
- Lenguaje visual minimalista, moderno y limpio.
- Voz directa, breve y natural tanto en español como en portugués.
- El cubo es el foco visual y funcional.
- Alto contraste, tipografía moderna y espacio suficiente.
- La referencia de proceso 3D es `img2threejs/img2threejs`.
- Las referencias de criterio visual y motion son Impeccable, Emil Kowalski y Taste Skill.
- El video `https://www.youtube.com/watch?v=rvJz-dmQO9Q` es inspiración de punto de partida, no una pieza para copiar.

## Evidence on Hand

- Repositorio de destino confirmado: `Bryan-dev074/Cubo-3D`.
- Número de WhatsApp confirmado: `+595982064334`.
- No se proporcionaron fotografías propias del producto, logotipo, marca, precio, stock, envíos, garantía, testimonios ni especificaciones físicas. La página no debe inventarlos.

## Product Principles

1. La interacción demuestra el producto y nunca retrasa la compra.
2. Resolver el cubo transforma el logro del visitante en un momento comercial relevante.
3. Cada movimiento debe sentirse preciso, comprensible y reversible.
4. La versión móvil debe ser una experiencia completa, no una reducción pasiva del escritorio.
5. Rendimiento, accesibilidad y claridad tienen prioridad sobre efectos sin función.

## Accessibility & Inclusion

- Controles esenciales disponibles fuera del canvas y operables con teclado.
- Objetivos táctiles de al menos 44×44 px.
- Foco visible, contraste legible y estados anunciados para tecnologías de asistencia.
- El atributo de idioma del documento debe reflejar el idioma seleccionado.
- Respeto por `prefers-reduced-motion`.
- Fallback útil cuando WebGL no está disponible o la escena no puede cargarse.

## Confirmed Product Assumption

- Por falta de una fotografía o selección del producto, se trabajará con un cubo premium genérico, sin marca ni precio. El usuario aprobó continuar con esta representación. Puede reemplazarse más adelante por información real sin cambiar el flujo principal.
