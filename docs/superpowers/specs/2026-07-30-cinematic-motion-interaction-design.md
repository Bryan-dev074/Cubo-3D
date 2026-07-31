# Cubo 3D — entrada cinematográfica e interacción precisa

**Fecha:** 2026-07-30
**Estado:** Aprobado por el usuario

## Objetivo

Elevar la experiencia actual con una introducción de producto de dos segundos,
movimiento ambiental elegante y controles de puntero inequívocos, sin volver a
introducir autorrotación, render WebGL permanente ni bajo rendimiento.

La experiencia debe conservar la composición editorial blanca y cobalto ya
aprobada. El movimiento debe reforzar la idea de que una caja premium se abre,
entrega el producto y se convierte en la superficie de juego.

## Principios

- El cubo permanece totalmente quieto cuando el usuario no interactúa.
- La animación de entrada es finita, física y cinematográfica; no caricaturesca.
- Los movimientos ambientales se coordinan por zonas y tienen largos descansos.
- Solo se animan `transform` y `opacity` en la interfaz, salvo transiciones de
  datos ya existentes.
- El cursor comunica la acción disponible y el gesto que está en progreso.
- Toda interacción conserva mouse, touch, teclado y movimiento reducido.
- Finalizada cualquier animación Three.js, el render vuelve a cero draw calls.

## Enfoques considerados

### 1. Caja HTML/CSS y cubo 3D real — seleccionado

Una cubierta HTML/CSS representa la caja cerrada y sus cuatro solapas. La
interfaz final ya está renderizada debajo desde el primer frame. Al abrirse la
caja, el grupo 3D real cae y se asienta sobre una sombra independiente.

Ventajas:

- adapta la caja a cualquier viewport sin recalcular geometría 3D;
- mantiene estable LCP y CLS;
- permite que la interfaz y WebGL carguen en paralelo;
- usa la GPU solo durante una secuencia finita;
- separa la sombra del cubo y de la cámara.

### 2. Caja completa dentro de Three.js — descartado

Ofrece profundidad real, pero retrasa la primera vista, requiere más geometría,
luces y frames, y hace más frágil la entrada en dispositivos móviles.

### 3. Animar como una sola superficie 2D — descartado

Es económico, pero la caída pierde peso, la sombra tiende a viajar con el
canvas y el producto deja de sentirse como el cubo real que después se juega.

## Coreografía de entrada

La secuencia se reproduce en cada carga completa de la página y dura
aproximadamente 2.000 ms en el caso normal.

### Fase 1 — caja sellada, 0–350 ms

- Una superficie de papel blanco cálido cubre la interfaz.
- Se ven el cobalto, marcas de registro, líneas de corte y el nombre CUBO 3D.
- Una señal de luz muy tenue recorre el cierre, sin mover el layout.

### Fase 2 — apertura, 350–1.150 ms

- Cuatro solapas se abren mediante perspectiva CSS y `transform-origin` en sus
  bisagras.
- Los inicios se desfasan entre 40 y 60 ms para evitar simetría mecánica.
- La aceleración inicial es corta y el final desacelera suavemente.
- La interfaz aparece progresivamente entre los huecos de las solapas.

### Fase 3 — revelado, 1.150–1.350 ms

- Las solapas terminan fuera del área útil y la cubierta pierde opacidad.
- Título, franja, plano, telemetría y controles ya ocupan su posición final.
- No se desplaza el layout ni se oculta semánticamente el contenido principal.

### Fase 4 — caída del cubo, 1.350–2.000 ms

- El grupo 3D comienza por encima de su encuadre final.
- La caída acelera como un objeto con peso; no usa velocidad lineal constante.
- El cubo lleva una inclinación inicial de 4–6 grados y termina exactamente en
  su orientación canónica.
- Al tocar el suelo hace un único asentamiento cercano al 3% y vuelve a su
  posición final. No rebota repetidamente y no se deforma.
- La sombra nunca se traslada: pasa de tenue y algo concentrada a su opacidad y
  escala final justo antes del contacto.
- Al completar el asentamiento se detiene la invalidación de Three.js.

La máquina de estados es `sealed → opening → reveal → drop → ready`. La
finalización es idempotente y combina eventos reales de animación con un
watchdog de seguridad; no depende de una cadena de temporizadores sin cleanup.

La cubierta es `aria-hidden`, captura el puntero mientras está cerrada y nunca
permite activar por accidente un control que todavía no se ve. Presionar
`Escape`, comenzar navegación por teclado o activar el enlace de salto termina
la introducción inmediatamente y coloca el cubo en su estado final. El
contenido principal permanece disponible para tecnologías de asistencia desde
el inicio.

La caída solo comienza si la escena WebGL está lista. Si WebGL tarda más que la
apertura, la interfaz se revela sin bloquearse y el cubo usa una aparición
abreviada al estar disponible. Si WebGL falla, continúa el fallback localizado
existente.

## Sombra

Se elimina `ContactShadows` como fuente visual principal. En su lugar se usa una
sombra elíptica precomputada, anclada al escenario detrás del canvas:

- posición fija y responsive respecto al lugar de reposo del cubo;
- gradiente suave de grafito, sin borde;
- no forma parte del grupo que gira ni de la cámara orbital;
- solo anima opacidad y escala durante la caída;
- permanece idéntica al rotar la vista o mover una capa;
- reduce carga GPU y evita regeneración de sombras.

Una prueba visual compara su caja delimitadora y estilo antes y después de una
rotación completa de vista.

## Contrato de mouse, touch y teclado

### Mouse

- Click izquierdo sobre una pieza: selecciona y gira una capa.
- Click izquierdo sobre el fondo del escenario: no rota la vista ni cambia el
  cubo.
- Click derecho y arrastre en cualquier parte del escenario: rota la vista del
  cubo.
- El menú contextual queda desactivado únicamente dentro del escenario 3D.
- Click derecho sobre una pieza nunca inicia, previsualiza ni confirma una capa.

### Propiedad del gesto

Al presionar una pieza con click izquierdo se congelan hasta soltar:

- ID de la pieza inicial;
- cara y normal tocadas;
- candidatos de eje;
- capa seleccionada;
- ID del puntero.

Aunque el cursor atraviese otra pieza, sus eventos no pueden reemplazar el
ancla inicial. El preview y el movimiento confirmado siempre pertenecen a la
pieza/capa con la que comenzó el gesto. La propiedad termina solo con
`pointerup`, `pointercancel`, `lostpointercapture`, desmontaje o bloqueo del
juego.

### Touch

- Arrastrar desde una pieza conserva el gesto de capa.
- Arrastrar desde el fondo conserva la rotación de vista.
- No se muestra cursor personalizado.
- Los objetivos táctiles existentes mantienen un mínimo de 44 px.

### Teclado

Los controles de las nueve capas, ayuda, idioma, reinicio, deshacer y compra
conservan su comportamiento y foco visible. El cursor personalizado no altera
la navegación ni los anuncios accesibles.

## Cursor contextual

En dispositivos con puntero fino aparece un único cursor DOM, `aria-hidden` y
con `pointer-events: none`. El cursor nativo solo se oculta después de que el
cursor personalizado está montado.

Estados:

- `idle`: punto cobalto y retícula técnica discreta;
- `action`: forma compacta de confirmación sobre botones y enlaces;
- `layer-ready`: arco de cuarto de vuelta al pasar sobre una pieza;
- `layer-drag`: flecha orientada según la tangente, eje y dirección del gesto
  real;
- `orbit`: anillo orbital mientras se mantiene click derecho;
- `disabled`: retícula atenuada cuando el cubo está animando o bloqueado.

La posición se actualiza mediante una referencia DOM y un único
`requestAnimationFrame`, no mediante estado de React en cada `pointermove`.
Desaparece al salir de la ventana, al usar touch, con movimiento reducido y
cuando la pestaña está oculta.

## Movimiento ambiental

“Animar toda la interfaz” se interpreta como dar vida a cada región principal,
no mover literalmente cada nodo al mismo tiempo.

Señales coordinadas:

- franja cobalto: respiración muy leve de sus líneas técnicas;
- plano de empaque: pulso de opacidad inferior al 8% y una marca de registro
  con microdesplazamiento;
- matriz de piezas: conserva su barrido lento;
- estado: punto con respiración suave;
- dial y capas: reaccionan a datos reales con transiciones ligeras;
- CTA: brillo ocasional de baja opacidad, con pausa larga;
- dock: elevación de 2–4 px y escala mínima al abrir utilidades;
- cursor: transiciones de forma breves, sin elasticidad excesiva.

Los ciclos ambientales duran entre 4,8 y 9 segundos, con fases desfasadas y
periodos visibles de reposo. No se animan de forma continua los números de
movimientos, progreso o valores de telemetría.

Un estado raíz pausa todas las señales ambientales durante:

- la entrada;
- un gesto de capa u órbita;
- la cola de giros;
- la celebración;
- ayuda o panel modal abierto;
- pestaña oculta;
- preferencia de movimiento reducido.

## Curva y tiempos del sistema

- microfeedback de botones/cursor: 120–180 ms;
- paneles y utilidades: 180–240 ms;
- cambios de estado visual: 220–320 ms;
- revelados editoriales: 320–480 ms;
- caída/asentamiento: 650 ms dentro de la secuencia total.

La curva base es una desaceleración tipo `cubic-bezier(0.22, 1, 0.36, 1)`.
La caída usa una función física finita con delta limitado y un único
asentamiento. Se prohíben `transition: all`, animaciones de layout y
`useFrame`/rAF infinitos en Three.js.

## Movimiento reducido y visibilidad

Con `prefers-reduced-motion: reduce`:

- la caja usa un crossfade de 140–180 ms;
- las solapas no rotan;
- el cubo aparece en su posición final, sin caída;
- el cursor no reemplaza al nativo;
- se desactivan todos los loops ambientales;
- los giros solicitados por el usuario siguen funcionando de forma inmediata.

Al ocultar la pestaña se pausan CSS, cursor y relojes finitos. Al volver, una
animación activa reanuda desde su tiempo acumulado, sin saltar al final. Todos
los listeners, frames y watchdogs se cancelan al desmontar.

## Arquitectura prevista

- `PackageIntro`: cubierta, solapas y eventos de fase.
- `useIntroSequence`: máquina de estados, escena lista, visibilidad y reduced
  motion.
- `AdaptiveCursor`: posición imperativa y representación de modos.
- `useCursorMode`: traduce hover, botón, eje y dirección a un estado estable.
- `useLayerGesture`: filtra botón izquierdo y conserva el ancla inicial.
- `OrbitControls`: izquierdo desactivado, derecho asignado a rotación y touch
  conservado.
- `CubeScene`/`MagicCube`: handshake de escena y caída finita.
- `experience.module.css`: sombra fija, solapas, ambientación y pausas.

No se agregan dependencias de animación nuevas. Se reutilizan React, Three.js,
React Three Fiber, Drei y CSS.

## Pruebas y criterios de aceptación

### Unitarias y componentes

- secuencia normal recorre las cinco fases una sola vez;
- reduced motion omite rotación de solapas y caída;
- ocultar/reanudar pestaña conserva el tiempo activo;
- cleanup elimina frames, listeners y watchdogs;
- botón derecho no inicia ni captura una capa;
- botón izquierdo captura la pieza inicial;
- un `pointermove` entregado por otra pieza no cambia el ancla;
- cancelación libera captura y limpia el preview;
- cursor refleja `layer-ready`, eje/dirección, `orbit` y `disabled`.

### E2E

- intro completa en escritorio 1440×900 y móvil 390×844;
- no hay layout shift ni contenido cortado durante la apertura;
- click izquierdo sobre fondo no cambia la imagen del canvas;
- click izquierdo sobre pieza confirma exactamente una capa;
- click derecho sobre fondo y sobre pieza rota la vista sin sumar movimientos;
- el menú contextual no aparece dentro del escenario;
- touch mantiene capa y rotación de fondo;
- la sombra conserva posición y forma después de rotar;
- cruzar varias piezas con el botón sostenido conserva la pieza inicial;
- idioma ES/PT y estado del cubo sobreviven a la interacción;
- el cursor se oculta en touch y movimiento reducido;
- cero draw calls WebGL en reposo después de entrada, caída, giro y órbita.

### Rendimiento

- LCP menor de 2,5 s en la prueba local de producción;
- CLS menor de 0,1;
- interacción máxima menor de 200 ms;
- ninguna animación ambiental inicia render WebGL;
- ninguna animación continúa en pestaña oculta.

## Fuera de alcance

- música o efectos de sonido;
- física general o motor de cuerpos rígidos;
- caja 3D navegable después de la entrada;
- personalización manual de intensidad de movimiento;
- repetición de la intro sin recargar la página.
