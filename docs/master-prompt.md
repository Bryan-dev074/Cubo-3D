# Prompt maestro: Cubo Mágico 3D

## Rol

Actúa como un equipo senior de dirección de arte, diseño de producto digital, desarrollo WebGL, React y optimización para Vercel. Construye una experiencia terminada, no un prototipo ni una maqueta estática.

## Objetivo

Crea una landing page comercial bilingüe en español y portugués para vender un cubo mágico físico mediante una demostración 3D realmente jugable. El visitante debe poder observar, desordenar y resolver un cubo 3×3, recibir una celebración solo al resolverlo de verdad y continuar la compra por WhatsApp.

El sitio debe superar una demostración técnica de `img2threejs`: usa una imagen de referencia y sus principios para definir la apariencia, pero construye el objeto final como 26 cubitos procedurales e independientes. La escena no puede ser una foto extruida ni un cubo monolítico con una textura.

## Dirección creativa

La dirección se llama **La caja abierta**. Convierte un empaque premium desplegado en la superficie de juego:

- Un único fondo blanco humo frío, sin tema oscuro ni adaptación automática al
  esquema de color del sistema.
- Interfaz monocromática con un solo acento azul cobalto.
- Los seis colores clásicos pertenecen exclusivamente al cubo.
- Composición asimétrica: franja cobalto de empaque, promesa comercial a la izquierda, cubo monumental apoyado sobre el plano desplegado y columna técnica a la derecha.
- Líneas de pliegue y registro sutiles inspiradas en troqueles de empaque.
- Franja compacta de controles integrada como un pliegue del empaque.
- Mucho aire, alto contraste y ausencia de tarjetas genéricas.
- No usar degradados morados, neón, glassmorphism, mallas decorativas, estrellas, precios, testimonios ni especificaciones inventadas.
- Usar Archivo Black para el título y Archivo para cuerpo, controles y microcopy mediante `next/font`.

El cubo debe tener cuerpos de plástico grafito satinado, pequeños biseles, separaciones físicas, stickers geométricos redondeados, iluminación de estudio suave y reflejos controlados. Debe verse apoyado, no flotando. La sombra visual principal es una elipse HTML anclada al escenario detrás del canvas: no pertenece al grupo 3D ni a la cámara, permanece idéntica al rotar la vista o mover una capa y solo cambia opacidad y escala durante la caída inicial.

## Contenido obligatorio

### Español

- Título: `Cubo Mágico 3D`
- Descripción: `Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.`
- Desafío: `Desordenar cubo`
- Compra: `Comprar cubo`
- Ayuda breve: `Izquierdo: capas · Derecho: rotar`
- Ayuda táctil: `Con el dedo: pieza = capa · fondo = rotar`
- Éxito: `Lo resolviste.`
- Éxito secundario: `Ahora llevá el desafío a tus manos.`
- CTA de éxito: `Comprar ahora`

### Portugués

- Título: `Cubo Mágico 3D`
- Descripción: `Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.`
- Desafío: `Embaralhar cubo`
- Compra: `Comprar cubo`
- Ayuda breve: `Esquerdo: camadas · Direito: girar`
- Ayuda táctil: `Com o dedo: peça = camada · fundo = girar`
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

### Mouse

- Arrastrar con el botón izquierdo desde una pieza elige y gira su capa según la cara tocada, la coordenada de la pieza y la proyección de los dos movimientos tangentes posibles.
- Arrastrar con el botón izquierdo desde el fondo es inerte: no rota la vista, no selecciona una capa y no modifica el estado.
- Arrastrar con el botón derecho desde cualquier punto del escenario, incluso sobre una pieza, rota la vista completa con inercia moderada y nunca inicia una capa.
- Desactivar el menú contextual únicamente dentro del escenario 3D.
- Mantener zoom y paneo desactivados.

### Propiedad del gesto

- Mostrar feedback desde `pointerdown` e iniciar el gesto después de 8 a 10 px.
- Al comenzar con el botón izquierdo sobre una pieza, congelar su ID, cara, normal, candidatos de eje, capa e ID de puntero hasta que termine el gesto.
- Si el puntero cruza otra pieza mientras sigue presionado, conservar la pieza y la capa iniciales; ningún hover o `pointermove` posterior puede reemplazarlas.
- Previsualizar el giro y completar o cancelar al soltar según distancia y velocidad.
- Liberar la propiedad solo con `pointerup`, `pointercancel`, `lostpointercapture`, desmontaje o bloqueo del juego.

### Touch y teclado

- En touch, arrastrar desde una pieza conserva un gesto de capa y arrastrar desde el fondo conserva la órbita.
- Capturar el puntero y soportar mouse, touch y stylus sin guardar valores continuos del puntero en estado React.
- Ofrecer controles HTML y teclado para caras e inversos.

### Cursor contextual

- En escritorio con puntero fino, usar un único cursor DOM `aria-hidden` y sin eventos propios; ocultar el cursor nativo solo después de que el personalizado esté montado.
- Representar los estados `idle`, `action`, `layer-ready`, `layer-drag`, `orbit` y `disabled` con formas técnicas compactas que comuniquen la acción disponible.
- Actualizar su posición mediante una referencia DOM y como máximo un `requestAnimationFrame`, no con estado React por cada movimiento.
- Ocultarlo en touch, al salir de la ventana, con la pestaña oculta y bajo `prefers-reduced-motion`.

## Entrada cinematográfica y sombra

- Reproducir en cada carga completa una introducción finita de aproximadamente 2.000 ms con la máquina `sealed → opening → reveal → drop → ready`.
- Construir la cubierta y las cuatro solapas en HTML/CSS sobre la interfaz ya renderizada. Entre 0 y 1.350 ms, el empaque sellado se abre con perspectiva, desfases leves y una revelación sin cambios de layout.
- Entre 1.350 y 2.000 ms, dejar caer el grupo 3D real desde encima de su encuadre, con aceleración, inclinación inicial sutil y un único asentamiento cercano al 3%; terminar exactamente en su orientación y posición canónicas, sin rebotes repetidos.
- Mantener fija la sombra HTML durante toda la secuencia: solo cambia su escala y opacidad para anticipar el contacto.
- Bloquear los gestos del juego hasta `ready`, sin bloquear idioma, ayuda ni compra.
- Permitir que `Escape`, navegación por teclado o el enlace de salto terminen la introducción inmediatamente en su estado final.
- Esperar a que WebGL esté listo antes de iniciar la caída; si tarda, revelar la interfaz sin bloquearla y usar una aparición abreviada al estar disponible. Con fallo de WebGL, conservar el fallback localizado.
- Hacer idempotente la finalización, limpiar eventos y watchdogs al desmontar y pausar el tiempo activo cuando la pestaña está oculta.

## Juego

- `Desordenar cubo` ejecuta entre 18 y 22 movimientos externos, 20 por defecto.
- No repetir cara, inverso inmediato ni dos movimientos consecutivos del mismo eje.
- Usar una semilla inyectable en pruebas.
- Ofrecer deshacer, reiniciar y ayuda.
- Deshabilitar acciones incompatibles durante una animación, pero nunca la compra.
- Celebrar solo si hubo mezcla válida, el usuario hizo al menos un movimiento posterior, la cola está vacía y el estado es realmente resuelto.

## Instrumentación viva

Incorpora una columna técnica inspirada en un instrumento industrial, pero usa solamente información real derivada del motor:

- `26 piezas` / `26 peças`, con una matriz de puntos que resalta las 8 o 9 piezas de la capa activa.
- `9 capas` / `9 camadas`, con un mini diagrama que responde al eje y nivel seleccionado.
- `Giros de 90°`, con indicador de dirección conectado al signo del movimiento.
- `Movimientos` / `Movimentos`, con transición numérica.
- `Último giro`, con nombre natural localizado.
- `Estado`, con listo, desordenando, en juego y resuelto en ambos idiomas.
- `Mezcla` / `Mistura`, con progreso real sobre 20 movimientos.

La actividad constante debe ser mínima y significativa: respiración del estado al estar listo, ticks durante un giro, cambio de capa y pulso de piezas afectadas. Pausar al ocultar la pestaña y eliminar repetición bajo `prefers-reduced-motion`. Los indicadores visuales son `aria-hidden`; los mismos datos se exponen como texto sin convertir cada frame en un anuncio accesible.

En móvil, condensar la instrumentación en una banda horizontal con movimientos, estado y progreso. Los demás datos quedan en un control expandible.

## Motion

- Usar CSS y el bucle finito de React Three Fiber ya necesario para los giros y la caída; no agregar una dependencia externa de animación.
- Centralizar curvas y tiempos: microfeedback de 120 a 180 ms, paneles de 180 a 240 ms, cambios de estado de 220 a 320 ms y revelados editoriales de 320 a 480 ms.
- Usar `cubic-bezier(0.23, 1, 0.32, 1)` para entradas y respuestas, y `cubic-bezier(0.77, 0, 0.175, 1)` para movimiento continuo en pantalla.
- No usar `transition: all`.
- Escala activa aproximada de `0.97`.
- Giros de capas con resorte interrumpible y sin rebote excesivo.
- Celebración única: separación máxima de piezas del 6%, barrido de luz de 700 a 900 ms y reunión controlada.
- Dar vida a las regiones principales mediante ciclos ambientales coordinados de 4,8 a 9 segundos y descansos visibles: respiración mínima de líneas de la franja, pulso del plano inferior al 8%, microdesplazamiento de una marca de registro, barrido lento de piezas, pulso de estado, brillo ocasional del CTA y elevación mínima del dock.
- No animar continuamente números de movimientos, progreso, valores de telemetría ni el cubo 3D.
- Pausar todos los ciclos ambientales durante la entrada, gesto de capa u órbita, cola de giros, celebración, ayuda abierta, pestaña oculta o movimiento reducido.
- Con `prefers-reduced-motion`, mostrar la caja mediante un crossfade breve, omitir apertura de solapas y caída, colocar el cubo directamente en su estado final, conservar los giros solicitados y desactivar cursor personalizado y bucles ambientales.
- Aplicar hover solo bajo `hover:hover` y `pointer:fine`.
- Animar únicamente `transform` y `opacity` en la ambientación; evitar animaciones de layout, rAF infinitos y `useFrame` permanente.

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

- Usar Next.js App Router, React, TypeScript estricto, Three.js, React Three Fiber y Drei. No añadir una librería de animación para esta coreografía.
- Cargar la escena solo en cliente y separar Server Components de la isla interactiva.
- Compartir geometrías y materiales.
- Limitar DPR a 1.5 en móvil y 1.75 en escritorio.
- Resolver la sombra de contacto principal con la elipse HTML anclada; no regenerar sombras WebGL al rotar la cámara.
- Evitar bloom y profundidad de campo obligatorios.
- Reservar el espacio del canvas, usar `frameloop="demand"` y solicitar frames únicamente durante la entrada, un giro, una órbita, una celebración o una transición 3D real.
- Tras la intro, la órbita o un giro, volver a cero draw calls en reposo; el cubo no se autorrota ni flota continuamente.
- Mostrar inmediatamente un póster local.
- Si WebGL falla, conservar título, explicación, reintento y CTA de WhatsApp.
- Objetivos: LCP menor de 2.5 s, INP menor de 200 ms y CLS menor de 0.1.

## Tecnología, calidad y entrega

- Preparar scripts de lint, typecheck, pruebas unitarias, pruebas de componentes, E2E y build.
- Implementar el motor puro con TDD usando Vitest.
- Probar la interfaz con Testing Library.
- Verificar escritorio y vistas de 390×844 y 320×700 con Playwright.
- Comprobar idiomas, WhatsApp, teclado, intro, órbita con botón derecho, fondo inerte con botón izquierdo, propiedad del gesto de capa, touch, cursor contextual, sombra fija, mezcla, deshacer, reinicio, fallback, movimiento reducido y ausencia de overflow.
- Verificar que la sombra conserve caja y estilo al rotar, que el cursor no aparezca en touch ni movimiento reducido y que el canvas vuelva a cero draw calls después de entrada, giro y órbita.
- Resolver automáticamente el origen público con `VERCEL_PROJECT_PRODUCTION_URL` y usar `VERCEL_URL` como respaldo; no exigir un dominio propio ni una variable manual para desplegar con la URL predeterminada de Vercel.
- Permitir `NEXT_PUBLIC_SITE_URL` solo como override opcional para un dominio absoluto HTTP(S), sin credenciales ni barra final, y usar el origen resuelto en canonical, Open Graph, `robots.txt` y `sitemap.xml`.
- Documentar desarrollo, pruebas y despliegue manual en Vercel.
- No desplegar Vercel.
- Publicar la versión verificada en la rama `main` de `Bryan-dev074/Cubo-3D`.

## Criterio final

El resultado debe sentirse como una pieza comercial diseñada alrededor del producto, no como una plantilla con un canvas añadido. La compra debe estar disponible desde el primer momento y el logro de resolver el cubo debe reforzarla sin bloquear la experiencia.
