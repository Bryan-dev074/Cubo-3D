# Cubo Mágico 3D: Diseño y especificación

## Resumen

Construir una landing page comercial bilingüe que permita manipular, desordenar y resolver un cubo mágico 3×3 real en el navegador. La demostración 3D es el argumento de venta. El visitante puede comprar en cualquier momento mediante WhatsApp y recibe una llamada a la acción reforzada al completar el reto.

La versión inicial comercializa un cubo genérico sin marca ni precio. No se inventan stock, envíos, materiales físicos, magnetismo, garantía, testimonios ni formas de pago.

## Objetivos de éxito

1. El producto y las dos acciones principales se comprenden dentro del primer viewport.
2. El cubo responde con precisión a mouse, touch, stylus y teclado.
3. Cada capa exterior o central puede girar en ambas direcciones.
4. El estado lógico se conserva sin deriva numérica.
5. La celebración solo aparece después de una mezcla válida y una resolución real.
6. Español y portugués cubren todo el contenido y todos los estados.
7. El CTA genera el mensaje correcto para `wa.me/595982064334`.
8. La experiencia mantiene una ruta de compra funcional aunque WebGL falle.
9. La versión verificada queda en la rama `main` de `Bryan-dev074/Cubo-3D`.

## Dirección visual aprobada

La dirección se llama **La caja abierta**. La página se comporta como un empaque premium desplegado y convertido en superficie de juego.

### Primer viewport

- Encabezado compacto con marca textual, selector `ES / PT` y CTA de compra.
- Contenido comercial en el tercio izquierdo en escritorio.
- Cubo 3D de gran escala ocupando el centro y lado derecho.
- Franja cobalto de empaque y columna técnica conectada al estado real del cubo.
- Botón de desafío y CTA comercial visibles.
- Controles esenciales agrupados cerca del cubo.
- En móvil: contenido, cubo y controles en una sola columna, con compra accesible junto al borde inferior.

### Paleta y material

- Campo claro: blanco humo frío.
- Campo oscuro: grafito humo.
- Texto y estructura: grafito de molde, nunca negro absoluto.
- Acento único: azul cobalto.
- Producto: seis colores clásicos diferenciados.
- Plástico: grafito satinado con biseles suaves.
- Stickers: acabado satinado con clearcoat limitado.

### Motion

- Feedback de botones en 100-160 ms.
- Cambios ordinarios por debajo de 300 ms con `ease-out`.
- Giros de capa mediante resorte interrumpible, sin rebote cuando provienen de botones y con una transferencia sutil de velocidad cuando provienen de un gesto.
- Rotación ambiental mínima y detenida durante interacción.
- Instrumentación con actividad continua muy sutil y semántica: matriz de piezas, indicador de capa, dirección, contador y estado responden a los datos que representan.
- Pausar toda animación repetitiva cuando el documento no está visible.
- Celebración excepcional con separación corta de piezas y barrido de luz.
- `prefers-reduced-motion` sustituye desplazamientos por opacidad e iluminación.

## Contenido bilingüe

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

### Selección de idioma

- Leer `localStorage` antes de aplicar la detección automática.
- Si no existe elección persistida, usar portugués para códigos que comienzan con `pt`; español para todo lo demás.
- Mantener el estado del cubo al cambiar idioma.
- Actualizar `document.documentElement.lang`.
- Traducir copy, tooltips, diálogo de ayuda, estados, errores, etiquetas accesibles y mensaje de WhatsApp.
- Mantener diccionarios tipados con paridad comprobable.

### Telemetría

Etiquetas en español:

- `26 piezas`
- `9 capas`
- `Giros de 90°`
- `Movimientos`
- `Último giro`
- `Estado`
- `Mezcla`
- Estados: `Listo`, `Desordenando`, `En juego`, `Resuelto`

Etiquetas en portugués:

- `26 peças`
- `9 camadas`
- `Giros de 90°`
- `Movimentos`
- `Último giro`
- `Estado`
- `Mistura`
- Estados: `Pronto`, `Embaralhando`, `Em jogo`, `Resolvido`

Los valores proceden únicamente del motor:

- Total fijo de 26 cubitos visibles.
- Total fijo de 9 capas entre los tres ejes.
- Un movimiento confirmado representa 90 o 180 grados; el indicador ordinario muestra el cuarto de vuelta actual.
- Contador de movimientos confirmados del usuario.
- Último movimiento con cara o capa, dirección y nombre natural localizado.
- Estado de ciclo.
- Progreso de la cola de mezcla sobre sus 20 movimientos predeterminados.
- Identificadores de las 8 o 9 piezas afectadas por la capa activa.

La matriz de piezas enciende exclusivamente los cubitos afectados. El diagrama de capas cambia con eje y nivel. El indicador de dirección rota según el signo. El contador transiciona entre valores. El estado usa texto además de movimiento y color. La telemetría decorativa usa `aria-hidden`; un resumen textual accesible evita anuncios continuos.

## WhatsApp

Base:

`https://wa.me/595982064334?text=<mensaje-codificado>`

Español:

`Hola 👋 Quiero comprar el Cubo Mágico 3D 🧩 ¿Podrían confirmarme el precio, la disponibilidad y las opciones de entrega?`

Portugués:

`Olá 👋 Quero comprar o Cubo Mágico 3D 🧩 Poderiam me confirmar o preço, a disponibilidade e as opções de entrega?`

El mensaje se procesa con `encodeURIComponent`. La ruta no contiene el signo `+`.

## Modelo lógico

### Coordenadas

El cubo contiene 26 cubitos visibles. Cada cubito conserva:

```ts
type AxisValue = -1 | 0 | 1;
type Vec3i = readonly [AxisValue, AxisValue, AxisValue];
type Mat3i = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

interface CubieState {
  readonly id: string;
  readonly home: Vec3i;
  readonly position: Vec3i;
  readonly orientation: Mat3i;
}
```

El cubito central `[0, 0, 0]` no existe visual ni lógicamente.

### Movimientos

```ts
type Axis = "x" | "y" | "z";
type QuarterTurn = -1 | 1 | 2;

interface CubeMove {
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly turns: QuarterTurn;
}
```

Se admiten las capas externas y centrales. La notación visible deriva de:

- `x=1`: R
- `x=0`: M
- `x=-1`: L
- `y=1`: U
- `y=0`: E
- `y=-1`: D
- `z=1`: F
- `z=0`: S
- `z=-1`: B

La convención de signo queda centralizada en una única tabla y se prueba con movimiento más inverso.

### Aplicación

Para un movimiento:

1. Seleccionar cubitos por coordenada del eje.
2. Rotar posición mediante una matriz entera de cuarto de vuelta.
3. Premultiplicar orientación por la misma matriz.
4. Normalizar cada valor a `-1`, `0` o `1`.
5. Incrementar contador e historial solo después de completar la animación.

La vista deriva posición y cuaternión desde este estado. No usa los valores flotantes de Three.js como fuente de verdad.

### Estado resuelto

Para cada cubito:

1. La posición actual coincide con `home`.
2. Cada normal de sticker original, transformada por la orientación actual, coincide con su dirección original.

Esto permite rotaciones invisibles de centros alrededor de su propia normal y evita falsos negativos. La rotación global de la cámara o del grupo visual no altera el estado lógico.

## Gestos

### Órbita

- Arrastrar el fondo rota el grupo visual completo.
- La órbita conserva inercia moderada y límites verticales.
- El zoom y el paneo permanecen desactivados.
- La rotación global no modifica las coordenadas lógicas.

### Capa

Al presionar una pieza se registran:

- Identificador de puntero.
- Coordenada inicial.
- Punto de intersección.
- Normal dominante de la cara.
- Coordenada lógica del cubito.
- Historial corto de posiciones y tiempos.

Después de 8-10 px:

1. Tomar los dos ejes tangentes a la cara seleccionada.
2. Calcular el movimiento instantáneo `axis × point`.
3. Proyectarlo a pantalla con la cámara.
4. Comparar cada dirección proyectada con el arrastre.
5. Elegir el eje con mayor producto escalar absoluto.
6. Tomar la capa desde la coordenada del cubito en ese eje.
7. Derivar el signo desde el producto escalar.

Durante la previsualización, las piezas de la capa reciben posición y orientación temporales derivadas del ángulo. Al soltar:

- Completar a 90 grados si supera umbral de distancia o velocidad.
- Volver a cero en caso contrario.
- Transferir la velocidad al resorte.
- Aplicar el movimiento lógico únicamente al finalizar el encaje.

## Mezcla, historial y reinicio

- Mezcla de 20 movimientos externos por defecto; rango configurable de 18-22.
- No repetir cara ni ejecutar su inverso inmediatamente.
- Evitar dos movimientos consecutivos del mismo eje.
- Semilla inyectable para pruebas.
- Confirmar que el resultado no está resuelto; regenerar si fuera necesario.
- Deshacer aplica el inverso del último movimiento confirmado.
- Reiniciar restaura el estado resuelto, limpia colas e historial y cierra la celebración.
- Botones incompatibles se deshabilitan durante una animación; el CTA de compra nunca se deshabilita.

## Celebración

Condiciones:

- Existió una mezcla válida.
- El usuario confirmó al menos un movimiento después de mezclar.
- La cola está vacía.
- `isSolved` devuelve `true`.
- La celebración no fue emitida para este ciclo.

Secuencia:

1. Detener rotación ambiental.
2. Separar cada cubito un máximo de 6% desde el centro.
3. Ejecutar barrido de luz de 700-900 ms.
4. Reunir las piezas con resorte sin rebote excesivo.
5. Mostrar mensaje y CTA en HTML semántico.

Con movimiento reducido solo se usa un cambio breve de color y opacidad. El éxito se anuncia mediante `aria-live="polite"`.

## Arquitectura de aplicación

### Render estático

`app/page.tsx` entrega contenido semántico, metadatos y el contenedor de experiencia.

### Isla cliente

`MagicCubeExperience` controla idioma, estado de interfaz, diálogo, mensajes y conexión con el motor.

`LiveTelemetry` recibe un snapshot tipado y representa la instrumentación sin recalcular la lógica del cubo.

### Escena

`CubeCanvas` carga React Three Fiber de forma dinámica. `MagicCube` representa los 26 cubitos y aplica animaciones imperativas dentro de `useFrame`, sin actualizar React por cada frame.

### Motor puro

Los módulos de `lib/cube` no importan React ni Three.js. Todas las transformaciones se prueban con Vitest.

## Rendimiento

- Next.js App Router con build optimizado para Vercel.
- React Three Fiber y Three.js cargados solo en cliente.
- Geometrías y materiales compartidos.
- DPR adaptativo con máximo 1.75 en móvil y 2 en escritorio.
- Shadow map 1024 en móvil y máximo 2048 en escritorio.
- Sin bloom ni profundidad de campo obligatorios.
- Canvas con espacio reservado para evitar CLS.
- Póster local inmediato.
- Render bajo demanda cuando la escena está quieta.
- Ningún valor continuo de puntero vive en React state.
- Las animaciones repetitivas de telemetría usan `transform` y `opacity`, se detienen con Page Visibility y desaparecen bajo movimiento reducido.
- Limpieza de listeners, geometrías, materiales y animaciones.

Objetivos:

- LCP menor a 2.5 s.
- INP menor a 200 ms.
- CLS menor a 0.1.
- Sin scroll horizontal en 320 px.

## Fallbacks

- Cargando: póster del cubo y CTA funcional.
- WebGL ausente: póster, explicación localizada, reintento y CTA.
- Error de escena: mensaje localizado y reintento.
- Movimiento reducido: sin órbita ambiental, sin explosión ni grandes desplazamientos.
- Contraste elevado: fondos sólidos, borde visible y foco reforzado.
- Transparencia reducida: eliminar blur de superficies.

## Accesibilidad

- Un solo H1.
- Botones de al menos 44×44 px.
- Foco visible.
- Diálogo de ayuda con foco gestionado.
- Controles alternativos para las seis caras e inversos.
- Anuncios discretos del último movimiento, mezcla, reinicio, error y resolución.
- Instrucciones fuera del canvas.
- No comunicar selección solo por color.
- Hover únicamente con `hover:hover` y `pointer:fine`.

## Estrategia de pruebas

### Unitarias

- Estado inicial.
- Movimiento e inverso.
- Cuatro cuartos de vuelta.
- Capas centrales.
- Coordenadas y matrices enteras.
- Mezcla determinista y no resuelta.
- Deshacer.
- Detección de estado resuelto con centros rotados.
- Paridad de diccionarios y URL de WhatsApp.
- Resolución de gesto desde proyecciones sintéticas.
- Snapshot de telemetría, piezas activas, estado y progreso de mezcla.

### Componentes

- Detección y persistencia de idioma.
- Cambio ES/PT sin reiniciar juego.
- Estados y etiquetas de controles.
- Ayuda.
- Éxito y CTA.
- Fallback de canvas.
- Telemetría localizada y reacción a movimiento, capa, estado y mezcla.

### E2E

- Hero y compra en escritorio.
- Hero y compra a 390×844 y 320×700.
- Mezcla, movimiento, deshacer y reinicio.
- Cambio de idioma.
- Navegación por teclado.
- Arrastre de órbita y capa.
- URL de WhatsApp en ambos idiomas.
- Sin overflow horizontal.
- Capturas en temas claro y oscuro.
- Columna técnica completa en escritorio y banda resumida en móvil.

## Entregables

- Código fuente y assets.
- `PRODUCT.md`.
- `DESIGN.md` actualizado después de construir.
- Esta especificación.
- Plan de implementación.
- Prompt maestro dentro del repositorio.
- README con desarrollo, pruebas y despliegue en Vercel.
- Pruebas verdes y build de producción.
- Revisión Impeccable y Emil.
- Historial Git y rama `main` publicados.

No se ejecutará el despliegue final en Vercel.
