# Prensa cinética y bloqueo definitivo de capa

**Fecha:** 2026-07-31
**Estado:** aprobado por el usuario
**Superficie:** landing interactiva `Cubo Mágico 3D`
**Modo:** Persuade + Experience

## 1. Problema

La experiencia actual tiene dos defectos perceptuales:

1. Durante un arrastre, el cubie inicial permanece como propietario interno, pero el eje y la capa vuelven a resolverse en cada `pointermove`. Una trayectoria que cambia de dirección puede pasar, por ejemplo, de la capa superior a la derecha sin soltar el botón. El cue visual también sustituye la pieza inicial por toda la capa resuelta. El resultado parece una transferencia de selección.
2. La intro y el estado de reposo respetan rendimiento y accesibilidad, pero su movimiento visible es demasiado tenue. La caja inicial parece una tarjeta plana y la interfaz final parece congelada. El título principal no participa del lenguaje cinético.

## 2. Objetivo

Crear una experiencia con una identidad de **prensa de empaque cinética**:

- la caja se calibra, se abre y se convierte espacialmente en la interfaz;
- el cubo entra como producto físico y luego permanece estable, con una microflotación CSS controlada;
- cada región participa en un ciclo ambiental coordinado;
- el título se reescribe periódicamente como si lo trazara un plotter;
- la capa elegida queda bloqueada desde la primera intención válida hasta `pointerup` o cancelación;
- escritorio y móvil mantienen precisión, legibilidad y alto rendimiento.

## 3. No objetivos

- No autorrotar la cámara ni el cubo.
- No mantener un `useFrame` o render WebGL ambiental infinito.
- No añadir una dependencia de animación.
- No alterar el modelo matemático del cubo ni sus movimientos válidos.
- No cambiar la paleta blanca, cobalto y grafito aprobada.
- No falsear datos de telemetría con números o giros inventados.
- No desplazar la sombra al orbitar la cámara.

## 4. Dirección elegida

Se elige **prensa cinética + caja mecánica**.

La página no se comporta como un dashboard digital ni como un conjunto de elementos flotantes independientes. Se comporta como una mesa de troquel que ejecuta un ciclo continuo de:

1. registro;
2. impresión;
3. inspección;
4. asentamiento.

La animación será constante en conjunto, no simultánea en todos los elementos. En escritorio habrá como máximo dos señales de alto contraste al mismo tiempo; en móvil, una. Los elementos de lectura conservan pausas largas.

## 5. Bloqueo de interacción

### 5.1 Propiedad del gesto

En `pointerdown` se conservan:

- cubie propietario;
- `pointerId`;
- punto inicial;
- candidatos proyectados;
- target de captura.

Ningún `pointerover`, `pointerout`, raycast o handler de otro cubie puede reemplazar esos datos.

### 5.2 Elección de capa

El drag mantiene la zona muerta existente de `8 px`.

Cuando aparece el primer movimiento no nulo:

- se congela el par `{ axis, layer }`;
- se conserva el candidato proyectado que produjo ese par;
- todos los `pointermove` posteriores se proyectan únicamente sobre ese candidato;
- `pointerup` usa el candidato bloqueado y no vuelve a buscar entre todos los candidatos.

Después del bloqueo solo puede cambiar `turns` al cruzar el origen y arrastrar en sentido contrario. `axis` y `layer` no pueden cambiar hasta liberar o cancelar.

Si un flick llega directamente a `pointerup` sin un `pointermove` previo, la capa se resuelve y bloquea allí una única vez para conservar el comportamiento de flick rápido.

### 5.3 Cue visual

La señal de propiedad permanece exclusivamente sobre el cubie inicial durante todo el gesto.

- La capa completa puede rotar como preview porque es el comportamiento físico correcto.
- El conjunto usado para el cue de escala no se reemplaza por todos los cubies de la capa.
- Cruzar otra pieza no cambia el cue, el eje del cursor ni la capa comprometida.
- Al liberar, cancelar, perder captura, deshabilitar o desmontar, se limpian captura, cue y bloqueo.

### 5.4 Invariante verificable

> Después del primer movimiento no nulo, `{ axis, layer }`, el cubie marcado y el eje del cursor permanecen idénticos hasta `pointerup/cancel`, aunque la trayectoria forme una L y el raycast cruce otros cubies. Solo `turns` puede invertirse.

## 6. Intro cinematográfica de 2 segundos

La duración visible normal permanece exactamente en:

- apertura: `1350 ms`;
- caída y asentamiento: `650 ms`;
- total: `2000 ms`.

No se altera el watchdog de cargas tardías: la experiencia debe quedar utilizable como máximo a los `2000 ms` visibles incluso si WebGL no monta a tiempo.

### 6.1 Storyboard

| Tiempo | Acción |
| --- | --- |
| `0–160 ms` | La marca de registro encaja `3 px`; el sello comprime de `scale(0.97)` a `1`; aparecen serial y microtexto técnico. |
| `140–360 ms` | Dos líneas de cierre nacen desde el sello usando `scaleX`; el canto interior y las bisagras adquieren profundidad. |
| `320–980 ms` | Solapas superior, derecha, inferior e izquierda se abren con `45–60 ms` de stagger, sombras de oclusión y easing físico. |
| `650–1350 ms` | El hueco central revela progresivamente la interfaz real. Lomo, header, hero, escenario, telemetría y dock entran con `35–55 ms` de stagger. |
| `1350–1820 ms` | El cubo entra completamente visible dentro del stage, con inclinación máxima de `5°`; nunca aparece recortado accidentalmente. |
| `1820–2000 ms` | Un solo asentamiento corto. La sombra sigue anclada; aumenta su presencia sin trasladarse. |

### 6.2 Continuidad espacial

- El lomo cobalto de la caja coincide con el lomo final en escritorio.
- En móvil, el lomo se convierte visualmente en la regla cobalto superior.
- Las líneas de pliegue aterrizan sobre el dieline de fondo.
- La interfaz comienza a verse por el hueco central entre `350–450 ms`; no se revela otro fondo blanco idéntico al final.
- La caja contiene cara exterior, cara interior, cantos, bisagras, registro, serial y sombras; no son cuatro `div` vacíos.
- El overlay en `reveal` y `drop` no intercepta eventos.

### 6.3 Cargas tardías y movimiento reducido

- Escena lista antes de abrir: se conserva la caída completa de `650 ms`.
- Escena lista después de abrir: se omite una caída completa tardía y se entra en `ready` sin teletransporte.
- Sin escena: watchdog visible termina la intro dentro del límite.
- `prefers-reduced-motion: reduce`: crossfade de `180 ms`, título completo y sin movimiento espacial.

## 7. Director ambiental

### 7.1 Reglas globales

- Usar CSS/DOM con `transform` y `opacity` para loops predeterminados.
- No usar `setInterval`, loops React ni `useFrame` ambiental.
- Mantener `Canvas frameloop="demand"` y `OrbitControls autoRotate={false}`.
- Pausar todo movimiento no esencial durante intro, gesto de capa, órbita, cola de movimientos, celebración, ayuda, éxito, pestaña oculta y movimiento reducido.
- Al volver de una pestaña oculta, reanudar el ciclo sin salto perceptible ni reinicio global.

### 7.2 Ritmo maestro

| Región | Movimiento | Periodo | Intensidad |
| --- | --- | ---: | --- |
| Título | Escritura, hold y borrado inverso | `10.8 s` | Alta durante menos de `1.2 s` |
| Plano de troquel | Desplazamiento y respiración | `8.4 s` | Máximo `2 px`; `0.48↔0.56` |
| Registro | Recorrido corto en L | `6.4 s` | Máximo `3 px` |
| Arcos del lomo | Recorrido vertical opuesto | `7.2 s` | Máximo `10 px` |
| Matriz de piezas | Barrido técnico | `4.8 s` | `1.05 s` activo y reposo |
| Estado | Pulso de inspección | `3.2 s` | `360 ms` activo |
| Dock | Línea de impresión | `6.4 s` | `720 ms` activo |
| CTA | Brillo controlado | `7.2 s` | `620 ms` activo |
| Marca del hero | Expansión horizontal | `5.4 s` | `620 ms` activo |

Los desfases deben asegurar que siempre exista alguna señal perceptible sin sincronizar todos los reinicios.

### 7.3 Microflotación del cubo

- El cubo no cambia orientación ni rota automáticamente.
- Un wrapper CSS de composición puede trasladar el canvas hasta `2 px` verticales en un ciclo de `6.4 s`.
- El movimiento no provoca frames WebGL adicionales.
- Se pausa al entrar al stage con puntero fino, al tocar o al iniciar cualquier interacción.
- En móvil se reduce a `1 px` o se elimina si la medición muestra inestabilidad.
- La sombra conserva su centro fijo. Puede variar levemente en opacidad/escala, pero no se traslada.

## 8. Título por plotter

El `h1` conserva el texto semántico completo y un `aria-label` localizado.

### 8.1 Estructura

- Se mantienen exactamente dos líneas.
- Cada línea se segmenta por grafemas.
- La capa visual animada es `aria-hidden`.
- Una base tenue o de contorno permanece siempre visible para evitar un título vacío y conservar el layout.
- Un bloque cobalto de registro acompaña únicamente al grafema activo.

### 8.2 Ciclo de `10.8 s`

- `0–760 ms`: escritura, aproximadamente `55 ms` entre grafemas y `160 ms` de entrada individual.
- `760–9800 ms`: título completo, sólido y quieto.
- `9800–10160 ms`: borrado inverso, aproximadamente `28 ms` entre grafemas.
- `10160–10800 ms`: queda la base reconocible antes de la nueva escritura.
- Al terminar la intro, el título queda completo y sólido; no se vuelve a escribir inmediatamente.
- El primer borrado y reescritura comienza `6.4 s` después de `ready`; a partir de ahí se repite el periodo completo de `10.8 s`.

El título permanece totalmente sólido más del 80% del tiempo y reconocible durante el resto. No se anima `width`, no cambia el salto de línea y no usa un caret parpadeante perpetuo.

## 9. Telemetría y controles

- Los valores reales solo se animan cuando cambian.
- El número puede cruzar hasta `6 px` con crossfade.
- El dial solo gira cuando existe un giro real y conserva su valor exacto.
- La capa correspondiente se ilumina con `40–50 ms` de stagger cuando cambia.
- En reposo se permiten barridos de inspección que no cambian ni inventan datos.
- El resumen móvil recibe una señal propia porque el instrumento completo comienza cerrado.
- La CTA móvil y de escritorio comparten el mismo tratamiento de brillo.
- Los controles frecuentes conservan feedback rápido de `100–160 ms`; no llevan loops de iconos.

## 10. Responsive

### Escritorio

- Mantener composición aprobada de lomo, hero, cubo y telemetría.
- Máximo dos señales ambientales de alto contraste simultáneas.
- El título no colisiona con el stage en `1440×900` ni `1600×1000`.

### Móvil

- Mantener `320 px`, `390 px` y landscape `844×390` sin overflow horizontal.
- Título con `line-height` aproximado de `0.92–0.94`, sin corte de acentos.
- Máximo una señal ambiental de alto contraste simultánea.
- Targets táctiles de al menos `44 px`.
- El cubo sigue siendo completamente manipulable y no queda debajo del dock o la telemetría.

## 11. Accesibilidad

- El contenido base permanece visible si falla JavaScript.
- El título animado no duplica su lectura en lectores de pantalla.
- `prefers-reduced-motion` conserva significado mediante opacity/color y elimina movimiento espacial.
- Hover motion solo se habilita con `(hover: hover) and (pointer: fine)`.
- Intro saltable con `Escape` y `Tab` como en el contrato actual.
- Focus visible, idioma y estado no dependen exclusivamente del movimiento.

## 12. Pruebas obligatorias

### 12.1 RED del gesto

1. Comenzar sobre un cubie.
2. Superar la zona muerta y resolver una capa.
3. Cambiar la trayectoria en L sobre un cubie distinto.
4. Verificar que `axis`, `layer`, cue y cursor no cambian.
5. Invertir sobre la misma proyección y verificar que solo puede cambiar `turns`.
6. Liberar sobre el otro cubie y verificar que `onMoveRequest` conserva la capa bloqueada.

La prueba E2E debe usar una trayectoria no colineal; el caso anterior `+54,+4 → +112,+8` no es suficiente.

### 12.2 Intro y título

- Estados intermedios explícitos dentro de `0–1350 ms`.
- Transición espacial entre caja e interfaz.
- Cubo completo dentro del stage durante la caída.
- Total normal cercano a `2000 ms` y límite visible máximo conservado.
- Título semántico único, dos líneas estables y grafemas animados decorativos.
- Pausa por interacción, visibilidad y reduced motion.

### 12.3 Movimiento y rendimiento

- Ningún `setInterval`, `autoRotate` o loop Three.js nuevo.
- Render WebGL vuelve a reposo después de una interacción.
- Sin overflow ni colisiones en viewports objetivo.
- LCP local menor de `2500 ms`, CLS menor de `0.1` y peor interacción menor de `200 ms` en laboratorio local.
- Revisión visual de intro, estado final, título a mitad de escritura, microflotación y gesto bloqueado.

## 13. Criterios de aceptación

El trabajo se considera terminado cuando:

1. una trayectoria en L no puede cambiar la capa elegida;
2. el cue permanece en la pieza inicial hasta liberar;
3. la intro muestra una caja con profundidad que revela y se convierte en la interfaz dentro de 2 segundos;
4. el título ejecuta el ciclo de plotter sin desaparecer ni cambiar de layout;
5. todas las regiones principales participan en el director ambiental;
6. el cubo no rota solo, conserva precisión y no genera render WebGL permanente;
7. sombra, móvil, ES/PT, WhatsApp y Vercel continúan funcionando;
8. pruebas unitarias, componentes, E2E, lint, TypeScript y build pasan;
9. una revisión independiente de interacción y otra de motion entregan `PASS`;
10. el commit publicado en `origin/main` coincide con el HEAD local.
