---
name: Cubo Mágico 3D
description: Un empaque premium convertido en una superficie de juego 3D.
colors:
  cobalt-action: "#0f4fd4"
  cobalt-action-hover: "#083cae"
  warm-paper: "#f8f8f7"
  raised-paper: "#ffffff"
  mold-graphite: "#20262a"
  soft-graphite: "#596269"
  technical-smoke: "#d5dce0"
  construction-line: "rgba(32, 38, 42, 0.22)"
  light-text: "#ffffff"
  shadow-fallback: "rgba(18, 27, 32, 0.16)"
  shadow-controls: "rgba(18, 27, 32, 0.18)"
  shadow-success: "rgba(14, 26, 35, 0.18)"
  shadow-dialog: "rgba(8, 15, 20, 0.28)"
  modal-backdrop: "rgba(16, 23, 28, 0.62)"
typography:
  display:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(5rem, 6vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.91
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(0.94rem, 1.25vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.71rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.055em"
  instrument:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1rem, 1.6vw, 1.55rem)"
    fontWeight: 400
    lineHeight: 1
  fallback-title:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1.1rem, 3vw, 1.45rem)"
    fontWeight: 400
  spine:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1.1rem, 2.3vw, 2rem)"
    fontWeight: 400
  wordmark:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1rem, 1.5vw, 1.25rem)"
    fontWeight: 400
  success-title:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.5rem)"
    fontWeight: 400
  dialog-title:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1.8rem, 5vw, 2.7rem)"
    fontWeight: 400
  notebook-display:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.6rem)"
    fontWeight: 400
  mobile-display:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 11vw, 3.5rem)"
    fontWeight: 400
  compact-label:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 700
  caption:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 400
  compact-action:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
  mobile-body:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.86rem"
    fontWeight: 400
  loading-body:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
  editorial-spine:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(2.45rem, 4vw, 4rem)"
    fontWeight: 400
  editorial-footer:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(0.6rem, 0.65vw, 0.68rem)"
    fontWeight: 700
  purchase-display:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(1.35rem, 1.8vw, 1.85rem)"
    fontWeight: 400
  packaging-copy:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  move-display:
    fontFamily: "Archivo Black, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 3.4vw, 3.35rem)"
    fontWeight: 400
  control:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
rounded:
  square: "0"
  indicator-lower: "0.35rem"
  indicator-upper: "0.5rem"
  spine-loop: "2rem"
  circle: "9999px"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  section: "1rem"
  touch-target: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-action}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.square}"
    padding: "0.8rem 1.15rem"
    height: "{spacing.touch-target}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.mold-graphite}"
    rounded: "{rounded.square}"
    padding: "0.55rem 0.75rem"
    height: "{spacing.touch-target}"
  instrumentation-panel:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.mold-graphite}"
    rounded: "{rounded.square}"
    padding: "0.8rem 0 0 1.25rem"
  success-panel:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.mold-graphite}"
    rounded: "{rounded.square}"
    padding: "1.1rem"
---

# Design System: Cubo Mágico 3D

## Overview

**Creative North Star: "La caja abierta"**

El mundo visual toma la lógica de un empaque premium desplegado y la convierte
en una superficie interactiva. La interfaz enmarca el producto sin encerrarlo:
el cubo ocupa el espacio con escala física, mientras el contenido comercial
aparece como información impresa sobre un embalaje preciso y contemporáneo.

La composición final combina planos de troquel, jerarquía comercial a la
izquierda y una franja cobalto con instrumentación viva. El color pertenece ante
todo al cubo; la interfaz se mantiene sobria para que cada sticker, giro y
cambio de estado sea legible. El movimiento surge de la manipulación directa y
de datos reales, no de ornamentación desconectada.

**Key Characteristics:**

- Composición asimétrica con un objeto 3D dominante.
- Superficie blanca cálida y limpia, sin nostalgia artesanal.
- Tipografía grotesca geométrica con jerarquía compacta.
- Controles táctiles que se sienten físicos desde el contacto.
- Telemetría constante pero significativa, conectada al estado real.
- Un solo momento extraordinario: la resolución legítima del cubo.

## Colors

La paleta de interfaz es monocromática con un único acento cobalto. Los seis
colores del cubo son contenido del producto y nunca se convierten en una paleta
decorativa.

### Primary

- **Cobalto de acción:** foco, selección, telemetría activa y acciones
  comerciales principales. Su variante profunda aparece solo en hover de
  puntero fino.

### Neutral

- **Papel cálido:** campo principal y continuidad visual con el plano desplegado.
- **Papel elevado:** respaldo de controles, ayuda, éxito y recuperación.
- **Grafito de molde:** voz principal y estructura; evita el negro absoluto en
  contraste normal.
- **Grafito suave:** instrucciones y estados secundarios.
- **Humo técnico:** separaciones tonales y progreso inactivo.
- **Línea de construcción:** bordes y trazos de plano, nunca cajas decorativas
  redundantes.

La superficie comercial es deliberadamente clara. No cambia de paleta según
la preferencia oscura del sistema: la referencia de producto, la iluminación
3D y el póster de carga permanecen dentro del mismo mundo blanco y cobalto.
Los modos de alto contraste usan una paleta funcional independiente definida
en CSS.

**The Product Owns Color Rule.** El multicolor se concentra en el cubo. La
interfaz no replica sus seis caras en botones, fondos o etiquetas.

**The One Accent Rule.** El cobalto es el único acento de interfaz.

## Typography

**Display Font:** Archivo Black (con Arial como respaldo)

**Body Font:** Archivo (con Arial como respaldo)

**Character:** Ambas familias comparten una construcción industrial y admiten
español y portugués. Archivo Black aporta presencia de empaque; Archivo mantiene
claros controles, estados y texto comercial sin sumar una voz editorial ajena.

### Hierarchy

- **Display:** título del producto en dos líneas como máximo; se adapta con
  `clamp` y conserva una interlínea compacta.
- **Body:** promesa comercial e instrucciones con una anchura de lectura breve.
- **Label:** rótulos técnicos en mayúsculas, peso alto y espaciado controlado.
- **Instrument:** números y estados destacados con cifras tabulares.
- **Responsive variants:** tamaños explícitos para wordmark, fallback, éxito,
  diálogo, portátil, móvil, captions y controles; no son escalas improvisadas.

**The Two-Line Rule.** El título principal ocupa como máximo dos líneas en
cualquier ancho.

**The Plain Language Rule.** Las instrucciones usan verbos directos y no
dependen de terminología de speedcubing.

## Layout

En escritorio, una espina cobalto antecede una cuadrícula asimétrica:
información comercial en el tercio izquierdo, escenario 3D expandido en el
centro y una columna técnica a la derecha. El plano de troquel cruza esas
divisiones sin competir con la lectura. El muelle de controles ocupa el borde
inferior de las dos primeras columnas.

En móvil y tablet compacta (hasta 900 px), la estructura se vuelve una sola
columna: encabezado, promesa, escena, controles, resumen de tres datos y compra
compatible con el área segura. La telemetría completa queda en un `details`
expandible. El wordmark `CUBO 3D`, idioma y compra permanecen visibles incluso
a 320 px.

El contenido esencial cabe en el primer viewport de 1440×900, 390×844 y
320×700. Puede crecer cuando el usuario abre controles o telemetría, cuando el
texto aumenta o cuando la ayuda está activa; nunca se recorta para simular un
hero perfecto.

**The First Viewport Rule.** Producto, promesa, desafío y compra aparecen sin
desplazamiento en un portátil estándar y en un teléfono contemporáneo.

## Elevation & Depth

La profundidad procede del objeto 3D, de su sombra de contacto y de diferencias
tonales amplias. Las superficies HTML son planas por defecto. Solo los paneles
que se superponen —controles de capas, ayuda, éxito y recuperación— usan una
sombra ambiental; los botones se separan mediante color, borde, foco y respuesta
al contacto.

### Shadow Vocabulary

- **Panel flotante:** sombra ambiental amplia para controles que emergen sobre
  la escena.
- **Momento resuelto:** sombra ligeramente más firme que sostiene el mensaje de
  éxito sin transformarlo en un modal dominante.
- **Ayuda modal:** máxima profundidad HTML del sistema, acompañada de un fondo
  atenuado.

**The Grounded Object Rule.** El cubo siempre conserva una referencia de suelo
o contacto; nunca flota dentro de un vacío digital.

**The Flat-By-Default Rule.** Una superficie en reposo no recibe sombra por
costumbre; la elevación comunica superposición real.

## Shapes

El lenguaje combina el volumen suavemente biselado del producto con superficies
HTML rectas y precisas. Botones, muelles, telemetría y diálogos conservan
esquinas cuadradas. Los círculos quedan reservados para indicadores de estado,
matrices de piezas y el dial de giro.

Los cubitos tienen biseles pequeños y separación real entre piezas. Los
stickers son cuadrados redondeados con radios inferiores al cuerpo. Los
objetivos principales mantienen una dimensión mínima de 2.75 rem.

**The Functional Radius Rule.** El radio expresa la geometría de un indicador o
del producto; no se aplica a cada contenedor.

## Components

### Buttons

- **Primary:** bloque cobalto, texto claro, peso alto, altura táctil mínima y
  presión visible mediante una escala breve.
- **Secondary:** superficie transparente, borde de construcción y grafito; en
  puntero fino el borde y el texto adoptan el cobalto.
- **Focus:** contorno cobalto de 3 px con separación de 3 px.
- **Motion:** presión, opacidad y desplazamiento duran 140–220 ms con una salida
  rápida `cubic-bezier(0.23, 1, 0.32, 1)`; los cambios de pintura son
  instantáneos y no se usa `transition: all`.

### Navigation

El encabezado combina wordmark, selector ES/PT y compra. En móvil reduce
espaciado y conserva los tres elementos y todos los objetivos táctiles,
incluido el viewport de 320 px.

### Control Dock

Muelle plano con tres acciones primarias: Desordenar, Reiniciar y Ayuda.
Deshacer y los giros por capa viven en una utilidad contextual que aparece por
hover, foco o puntero táctil/coarse. La rejilla flotante usa tres columnas en
escritorio y una columna desplazable en móvil, con
`overscroll-behavior: contain`.

### Live Instrumentation

Muestra una matriz real de 26 piezas, un diagrama isométrico de nueve capas,
dirección de 90 grados, contador, último giro, estado y progreso de mezcla. Los
números usan cifras tabulares. Un solo pseudo-elemento recorre la matriz de
forma tenue; las capas y el dial reaccionan a datos reales y el contador se
actualiza sin movimiento para respetar acciones iniciadas por teclado. Toda
actividad se pausa al interactuar, cuando la pestaña queda oculta y con
movimiento reducido.

### Success Moment

Panel de aparición única después de resolver una mezcla válida. Combina un
barrido de luz de 820 ms —evento raro y extraordinario— con una entrada del
panel de 260 ms. Puede cerrarse, no bloquea la página y expone la compra
localizada.

### Help and Fallback

La ayuda es un diálogo semántico con restauración de foco. El fallback de WebGL
mantiene poster local, texto ES/PT, reintento y compra por WhatsApp; nunca deja
un canvas vacío como única respuesta.

## Do's and Don'ts

### Do:

- **Do** mantener el cubo como el elemento visual más grande.
- **Do** mostrar feedback desde `pointerdown`.
- **Do** conservar copy, controles y CTA como HTML semántico fuera del canvas.
- **Do** adaptar DPR, contraste, transparencia y movimiento al dispositivo.
- **Do** usar la telemetría únicamente para información derivada del cubo real.
- **Do** conservar equivalentes accesibles cuando el gesto o WebGL no estén
  disponibles.

### Don't:

- **Don't** usar gradientes morados, brillos neón o fondos de malla genéricos.
- **Don't** encerrar el cubo dentro de una tarjeta.
- **Don't** convertir cada color de sticker en un color de interfaz.
- **Don't** añadir precio, stock, garantía, reseñas o prestaciones no
  confirmadas.
- **Don't** depender de hover, notación experta o texto dentro del canvas.
- **Don't** usar la marca Rubik ni logotipos de terceros.
