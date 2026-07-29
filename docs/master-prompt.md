# Prompt maestro: Cubo Mágico 3D

## Rol

Actúa como un equipo senior de dirección de arte, diseño de producto digital, desarrollo WebGL, React y optimización para Vercel. Construye una experiencia terminada, no un prototipo ni una maqueta estática.

## Objetivo

Crea una landing page comercial bilingüe en español y portugués para vender un cubo mágico físico mediante una demostración 3D realmente jugable. El visitante debe poder observar, desordenar y resolver un cubo 3×3, recibir una celebración solo al resolverlo de verdad y continuar la compra por WhatsApp.

El sitio debe superar una demostración técnica de `img2threejs`: usa una imagen de referencia y sus principios para definir la apariencia, pero construye el objeto final como 26 cubitos procedurales e independientes. La escena no puede ser una foto extruida ni un cubo monolítico con una textura.

## Dirección creativa

La dirección se llama **La caja abierta**. Convierte un empaque premium desplegado en la superficie de juego:

- Fondo blanco humo frío y alternativa grafito según el esquema del sistema.
- Interfaz monocromática con un solo acento azul cobalto.
- Los seis colores clásicos pertenecen exclusivamente al cubo.
- Composición asimétrica: promesa comercial a la izquierda y cubo monumental a la derecha.
- Líneas de pliegue y registro sutiles inspiradas en troqueles de empaque.
- Franja compacta de controles integrada como un pliegue del empaque.
- Mucho aire, alto contraste y ausencia de tarjetas genéricas.
- No usar degradados morados, neón, glassmorphism, mallas decorativas, estrellas, precios, testimonios ni especificaciones inventadas.
- Usar Archivo Black para el título y Archivo para cuerpo, controles y microcopy mediante `next/font`.

El cubo debe tener cuerpos de plástico grafito satinado, pequeños biseles, separaciones físicas, stickers geométricos redondeados, iluminación de estudio suave, reflejos controlados y sombra de contacto estable. Debe verse apoyado, no flotando.

## Contenido obligatorio

### Español

- Título: `Cubo Mágico 3D`
- Descripción: `Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.`
- Desafío: `Desordenar cubo`
- Compra: `Comprar cubo`
- Ayuda: `Arrastrá una pieza para girar su capa. Arrastrá el fondo para explorar.`
- Éxito: `Lo resolviste.`
- Éxito secundario: `Ahora llevá el desafío a tus manos.`
- CTA de éxito: `Comprar ahora`

### Portugués

- Título: `Cubo Mágico 3D`
- Descripción: `Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.`
- Desafío: `Embaralhar cubo`
- Compra: `Comprar cubo`
- Ayuda: `Arraste uma peça para girar a camada. Arraste o fundo para explorar.`
- Éxito: `Você conseguiu.`
- Éxito secundario: `Agora leve o desafio para as suas mãos.`
- CTA de éxito: `Comprar agora`

La compra abre `https://wa.me/595982064334` con el mensaje activo codificado mediante `encodeURIComponent`.

Mensaje en español:

`Hola 👋 Quiero comprar el Cubo Mágico 3D 🧩 ¿Podrían confirmarme el precio, la disponibilidad y las opciones de entrega?`

Mensaje en portugués:

`Olá 👋 Quero comprar o Cubo Mágico 3D 🧩 Poderiam me confirmar o preço, a disponibilidade e as opções de entrega?`

## Idiomas

- Detectar primero una preferencia persistida.
- Sin preferencia, usar portugués cuando el idioma del navegador comience con `pt`; español en cualquier otro caso.
- Proporcionar un selector visible `ES / PT`.
- Persistir la elección y actualizar `document.documentElement.lang`.
- Mantener el estado del cubo al cambiar de idioma.
- Traducir textos visibles, estados, errores, tooltips, nombres accesibles, anuncios y el mensaje de WhatsApp.

## Motor del cubo

- Modelar los 26 cubitos visibles con coordenadas enteras `-1 | 0 | 1`.
- Conservar para cada pieza identificador, posición inicial, posición actual y matriz de orientación entera.
- Representar cada movimiento con eje `x | y | z`, capa `-1 | 0 | 1` y cuartos de vuelta `-1 | 1 | 2`.
- Admitir capas exteriores y centrales.
- Aplicar movimientos con matrices enteras de cuarto de vuelta.
- Mantener Three.js únicamente como vista; nunca usar transformaciones flotantes como estado lógico.
- Detectar el estado resuelto comparando posición y normales originales de stickers transformadas.
- Permitir rotaciones invisibles de centros alrededor de su propia normal.
- Probar movimiento e inverso, cuatro giros, capas centrales, matrices, mezcla y estado resuelto.

## Interacción

- Arrastrar el fondo rota el cubo completo con inercia moderada.
- El zoom y el paneo permanecen desactivados.
- Arrastrar una pieza elige la capa según cara tocada, coordenada de la pieza y proyección de los dos movimientos tangentes posibles.
- Mostrar feedback desde `pointerdown`.
- Iniciar el gesto después de 8 a 10 px.
- Previsualizar el giro y completar o cancelar al soltar según distancia y velocidad.
- Capturar el puntero y soportar mouse, touch y stylus.
- No guardar valores continuos de puntero en estado React.
- Ofrecer controles HTML y teclado para caras e inversos.

## Juego

- `Desordenar cubo` ejecuta entre 18 y 22 movimientos externos, 20 por defecto.
- No repetir cara, inverso inmediato ni dos movimientos consecutivos del mismo eje.
- Usar una semilla inyectable en pruebas.
- Ofrecer deshacer, reiniciar y ayuda.
- Deshabilitar acciones incompatibles durante una animación, pero nunca la compra.
- Celebrar solo si hubo mezcla válida, el usuario hizo al menos un movimiento posterior, la cola está vacía y el estado es realmente resuelto.

## Motion

- Feedback de controles entre 100 y 160 ms.
- Transiciones ordinarias menores de 300 ms con propiedades explícitas.
- No usar `transition: all`.
- Escala activa aproximada de `0.97`.
- Giros de capas con resorte interrumpible y sin rebote excesivo.
- Celebración única: separación máxima de piezas del 6%, barrido de luz de 700 a 900 ms y reunión controlada.
- Con `prefers-reduced-motion`, sustituir desplazamientos por color y opacidad.
- Aplicar hover solo bajo `hover:hover` y `pointer:fine`.

## Responsive y accesibilidad

- Diseñar para 320 px en adelante sin scroll horizontal.
- En móvil, usar una columna, reservar aproximadamente 45 a 52 `dvh` al cubo y mantener accesible la compra respetando `safe-area-inset-bottom`.
- Un solo H1.
- Objetivos táctiles mínimos de 44 por 44 px.
- Foco visible y contraste suficiente.
- Ayuda mediante diálogo con foco gestionado.
- `aria-live="polite"` para movimientos, mezcla, reinicio, errores y resolución.
- No depender de hover, color o notación experta para comprender la experiencia.

## Rendimiento y fallbacks

- Usar Next.js App Router, React, TypeScript estricto, Three.js, React Three Fiber, Drei y Motion.
- Cargar la escena solo en cliente y separar Server Components de la isla interactiva.
- Compartir geometrías y materiales.
- Limitar DPR a 1.75 en móvil y 2 en escritorio.
- Usar sombras de 1024 en móvil y como máximo 2048 en escritorio.
- Evitar bloom y profundidad de campo obligatorios.
- Reservar el espacio del canvas y renderizar bajo demanda cuando sea posible.
- Mostrar inmediatamente un póster local.
- Si WebGL falla, conservar título, explicación, reintento y CTA de WhatsApp.
- Objetivos: LCP menor de 2.5 s, INP menor de 200 ms y CLS menor de 0.1.

## Tecnología, calidad y entrega

- Preparar scripts de lint, typecheck, pruebas unitarias, pruebas de componentes, E2E y build.
- Implementar el motor puro con TDD usando Vitest.
- Probar la interfaz con Testing Library.
- Verificar escritorio y vistas de 390×844 y 320×700 con Playwright.
- Comprobar idiomas, WhatsApp, teclado, órbita, giro de capa, mezcla, deshacer, reinicio, fallback, temas y ausencia de overflow.
- Documentar desarrollo, pruebas y despliegue manual en Vercel.
- No desplegar Vercel.
- Publicar la versión verificada en la rama `main` de `Bryan-dev074/Cubo-3D`.

## Criterio final

El resultado debe sentirse como una pieza comercial diseñada alrededor del producto, no como una plantilla con un canvas añadido. La compra debe estar disponible desde el primer momento y el logro de resolver el cubo debe reforzarla sin bloquear la experiencia.
