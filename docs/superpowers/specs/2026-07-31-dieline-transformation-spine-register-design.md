# Troquel transformable y lomo de registro

**Fecha:** 2026-07-31
**Estado:** dirección visual aprobada por el usuario; especificación pendiente de revisión final
**Superficie:** landing interactiva `Cubo Mágico 3D`
**Duración de intro:** `2000 ms` exactos en movimiento normal

## 1. Problema observado

La intro actual tiene piezas, pero no una transformación legible:

- la caja se percibe como una lámina frontal suspendida, sin volumen ni suelo;
- durante la apertura, grandes paneles blancos cubren una interfaz que ya es visible debajo;
- el lomo cobalto de la caja y el lomo real aparecen como dos objetos sin relación;
- las solapas desaparecen en vez de convertirse en regiones de la página;
- la caída del cubo parece provenir del cielo, no de su embalaje;
- la columna cobalto solo anima dos adornos laterales, mientras títulos, palabra vertical, textos, reglas y diagrama permanecen inmóviles.

El defecto principal no es la cantidad de movimiento, sino la falta de continuidad espacial y de una coreografía común.

## 2. Tesis visual aprobada

> La caja no se abre delante de la página: la caja se convierte físicamente en la página.

La intro será un **troquel tridimensional de precisión**. Sus superficies se abrirán, viajarán y terminarán exactamente como regiones reales de la composición:

- la franja cobalto se convertirá en el lomo izquierdo;
- la solapa superior se convertirá en el encabezado;
- la superficie derecha aterrizará como columna de telemetría;
- la base se expandirá hasta coincidir con el plano técnico del escenario;
- la solapa inferior dará continuidad visual al dock;
- el hueco central liberará el cubo.

Después de la intro, el lomo ejecutará una **pasada de registro de imprenta** continua: un único pulso de inspección viajará de arriba abajo y dará vida a cada objeto sin perjudicar la lectura.

## 3. Principios obligatorios

1. La interfaz final nunca se verá completa debajo de paneles blancos semitransparentes.
2. En cada instante debe existir un acto principal claramente reconocible.
3. Las superficies de la caja deben mostrar cara exterior, cara interior, canto, bisagra y sombra de oclusión.
4. El overlay terminará en la composición final exacta; no ocultará una maqueta para sustituirla por otra página.
5. El cubo no rotará durante su llegada, no cruzará el título y nunca quedará fuera del escenario.
6. La sombra del cubo conservará el mismo centro. Durante la llegada solo puede cambiar su escala y opacidad.
7. El movimiento ambiental será constante en conjunto, no simultáneo ni frenético.
8. Solo se animarán `transform`, `opacity`, filtros ligeros ya validados o trazos SVG; no habrá loops React ni un render WebGL permanente.

## 4. Estructura visual de la intro

### 4.1 Objeto inicial

La primera imagen será una caja-troquel compacta, grande y apoyada sobre un plano invisible:

- perspectiva superior de `6–8°`;
- ligera orientación horizontal para hacer visibles al menos dos cantos;
- proporción cercana a la composición final, no una tarjeta panorámica;
- sombra de contacto corta y estable;
- papel exterior blanco cálido;
- interior blanco frío con contraste suficiente;
- cantos grafito y pliegues técnicos finos;
- precinto cobalto, serial y marcas de registro como detalles funcionales.

No habrá entrada mediante un simple fade. La caja estará presente desde el primer fotograma útil.

### 4.2 Continuidad con la interfaz

Cada pieza animada tendrá un destino final visible:

| Pieza de la caja | Destino |
| --- | --- |
| Banda cobalto | `cobaltSpine` de escritorio o regla superior móvil |
| Solapa superior | encabezado y línea horizontal superior |
| Solapa izquierda | región hero y marcas de registro |
| Solapa derecha | divisor y telemetría |
| Base | plano de troquel del escenario |
| Solapa inferior | continuidad hacia el dock |

La interfaz aparecerá como tinta y contenido depositados sobre superficies que ya llegaron a su lugar. No se aplicará un crossfade global temprano.

## 5. Storyboard de 2000 ms

| Tiempo | Acción principal |
| --- | --- |
| `0–120 ms` | Caja presente y apoyada. Marcas de registro hacen un ajuste de `2–3 px`; la sombra confirma el plano. |
| `120–300 ms` | El precinto cobalto se tensa, se divide y libera la tapa. La tapa responde con una apertura inicial de `5–7°`. |
| `300–720 ms` | Las cuatro superficies se abren con `50–60 ms` de diferencia. Cantos, interiores y sombras de bisagra hacen legible la profundidad. |
| `600–1000 ms` | Las superficies viajan a sus destinos: lomo, encabezado, escenario, telemetría y dock. La página solo se revela en zonas físicamente descubiertas. |
| `900–1230 ms` | Pliegues y líneas técnicas se dibujan desde las bisagras. Título, texto, CTA y métricas aparecen como una pasada de tinta con stagger corto. |
| `1230–1350 ms` | Caja e interfaz ya son el mismo objeto. Se elimina el overlay sin fade, flash blanco ni salto de geometría. |
| `1350–1760 ms` | El cubo se libera desde el hueco central, comenzando solo un `12%` por encima de su posición final y con inclinación máxima de `3°`. |
| `1760–1920 ms` | Contacto y un único asentamiento rígido. La sombra pasa de amplia/ligera a corta/firme sin desplazarse. |
| `1920–2000 ms` | Una confirmación cobalto recorre registro y telemetría; se habilitan controles y comienza el director ambiental. |

### 5.1 Fotogramas de control

- `160 ms`: objeto claramente tridimensional y apoyado.
- `450 ms`: al menos una solapa a medio ángulo con interior y bisagra visibles.
- `650 ms`: tres planos de profundidad diferenciables.
- `900 ms`: el lomo cobalto ya viaja hacia el borde izquierdo.
- `1100 ms`: el título no está cubierto por paneles opacos.
- `1350 ms`: no queda ninguna superficie flotando delante de la interfaz.
- `1760 ms`: el cubo está completo dentro del escenario.
- `2000 ms`: composición final idéntica al estado interactivo.

## 6. Movimiento del lomo cobalto

### 6.1 Director maestro

Toda la columna comparte un ciclo de `6.4 s`, en dirección superior → inferior. Cada objeto participa, pero descansa cerca del 80% del ciclo. Como máximo dos zonas adyacentes estarán en fase activa al mismo tiempo.

| Fase | Elemento | Tratamiento |
| --- | --- | --- |
| `0–550 ms` | marca superior y arco alto | desplazamiento vertical `0 → 8 → 0 px`; opacidad `0.48 → 0.80 → 0.48` |
| `300–950 ms` | “LA CAJA ABIERTA” | pulso de registro horizontal máximo `3 px`; nunca baja de `0.82` de opacidad |
| `620–1280 ms` | “DISEÑO QUE SE DESPLIEGA” y regla | desplazamiento máximo `2 px`; regla `scaleX(.55 → 1 → .72)` |
| `1180–3150 ms` | letras de `CUBO 3D` | impresión secuencial de arriba abajo; `420 ms` por glifo y `210 ms` de stagger |
| `3000–3340 ms` | regla inferior | trazo horizontal breve que entrega el pulso al footer |
| `3200–4550 ms` | texto inferior | entrada de registro por línea, máximo `2.5 px`, `360 ms` y `145 ms` de stagger |
| `4450–5600 ms` | diagrama SVG | ensamblaje por capas: base, verticales y caras; sin rotación ornamental |
| `5450–6150 ms` | arco bajo | recorrido opuesto máximo `8 px` |
| `6150–6400 ms` | columna completa | asentamiento visual y reinicio sin salto |

### 6.2 Palabra vertical

`CUBO 3D` conservará su presencia sólida y legible. Cada glifo recibirá un golpe de impresión muy corto:

- desplazamiento inicial máximo de `-2 px`;
- escala máxima `1.02`;
- leve separación de registro cobalto/blanco solo durante el golpe;
- retorno con `cubic-bezier(.23,1,.32,1)`;
- ninguna letra desaparecerá ni parpadeará.

### 6.3 Diagrama inferior

El cubo lineal se ensamblará de manera técnica:

1. aparece la base;
2. suben las aristas verticales;
3. se conectan cara izquierda y derecha;
4. un punto de registro confirma la figura.

Se usarán `stroke-dashoffset`, `opacity` y desplazamientos menores a `3 px`. No girará como un icono genérico.

### 6.4 Pausas

El ciclo ambiental completo se pausará durante:

- la intro;
- un gesto sobre el cubo;
- una órbita;
- un giro de capa;
- mezcla, reinicio, ayuda o celebración;
- pestaña oculta;
- `prefers-reduced-motion: reduce`.

Al reanudarse conservará una continuidad visual sin saltar todos los elementos al inicio simultáneamente.

## 7. Resto de la interfaz

La columna será el reloj visual principal. El resto de las animaciones constantes existentes se mantendrá desfasado para evitar sincronía artificial:

- título: ciclo de plotter con largos periodos completamente legibles;
- CTA: brillo de inspección controlado, nunca pulsación continua de escala;
- telemetría: barridos decorativos que no cambian datos reales;
- plano técnico: respiración máxima de `2 px`;
- cubo: microflotación CSS máxima de `2 px`, sin autorrotación ni frames WebGL extra;
- sombra: centro fijo, solo variación mínima de escala/opacidad.

## 8. Responsive

### Escritorio

- Mantener la composición aprobada del screenshot de referencia.
- El lomo conserva su ancho y su jerarquía tipográfica.
- La intro puede usar profundidad y recorrido completo sin invadir el título.

### Móvil y tablet

La intro no será una miniatura del escritorio:

- caja de aproximadamente `90vw`, con proporción más vertical;
- la banda cobalto aterriza como la regla superior móvil;
- laterales se pliegan detrás sin salir del viewport;
- el cubo comienza solo `8–9%` por encima de su posición final;
- distancias menores, misma duración de `2000 ms`;
- en `320 px` solo permanecen detalles de embalaje que puedan leerse.

En el estado final móvil, el contenido del lomo sigue oculto por falta de espacio, pero la regla superior realiza un pulso de impresión de `420 ms` cada `4.8 s`. No debe causar cambio de layout ni overflow horizontal.

En viewports bajos se reducen las amplitudes del lomo aproximadamente un 30%.

## 9. Accesibilidad y rendimiento

- `prefers-reduced-motion: reduce`: intro mediante transición de opacidad de hasta `180 ms`; sin movimiento espacial ni ciclos infinitos.
- `Escape` y `Tab` conservan el mecanismo actual para saltar la intro.
- Todo texto continúa presente semánticamente y las capas decorativas son `aria-hidden`.
- No se animan propiedades que provoquen reflow continuo.
- No se añade una dependencia de animación.
- `Canvas` conserva `frameloop="demand"` y el cubo no recibe autorrotación.
- Hover motion solo se habilita con `(hover: hover) and (pointer: fine)`.

## 10. Pruebas y evidencia

### Componentes

- La intro conserva sus fases `sealed → opening → reveal → drop → ready`.
- La duración normal completa es `2000 ms`.
- Cada superficie del troquel tiene un destino identificable.
- Todos los grupos del lomo incluyen una animación propia dentro del ciclo maestro.
- Pausa, pestaña oculta y movimiento reducido alcanzan también a los descendientes, no solo a los pseudo-elementos.

### E2E visual

- Capturas de intro en `160`, `450`, `650`, `900`, `1100`, `1350`, `1760` y `2000 ms`.
- Filmstrip del lomo cada `200 ms` durante al menos `7 s`.
- En cada segundo debe existir actividad visible, pero ningún texto debe desplazarse más de `3 px`.
- Opacidad mínima del texto normal: `0.78`; palabra vertical: `0.86`.
- Verificación de cero loops espaciales con movimiento reducido.
- Verificación en `1600×1000`, `1440×900`, `390×844`, `320×568` y `844×390`.

### Regresiones

- Interacción de capa y órbita no cambia.
- Sombra permanece centrada al orbitar y durante la llegada.
- ES/PT, WhatsApp, intro saltable y controles continúan funcionando.
- No hay overflow horizontal ni colisiones con dock o telemetría.
- Build de Vercel funciona sin exigir un dominio personalizado.

## 11. Criterios de aceptación

El trabajo se considera terminado únicamente cuando:

1. la intro se entiende como una caja con volumen desde el primer fotograma;
2. la caja se convierte espacialmente en la interfaz, sin paneles cubriendo contenido ya visible;
3. el cubo se libera desde el hueco central y tiene un único asentamiento sobrio;
4. la intro visible dura `2000 ms`;
5. cada elemento visible del lomo participa en el ciclo maestro;
6. el movimiento del lomo es constante en conjunto y legible en cada instante;
7. móvil recibe una coreografía específica y no una reducción defectuosa;
8. movimiento reducido elimina todo loop no esencial;
9. pruebas, TypeScript, lint, build y E2E pasan;
10. revisión visual independiente de intro y motion entrega veredicto `PASS`;
11. el commit verificado se publica en `origin/main`.
