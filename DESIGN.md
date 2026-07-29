---
name: Cubo Mágico 3D
description: Un empaque premium convertido en una superficie de juego 3D.
---

<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Cubo Mágico 3D

## Overview

**Creative North Star: "La caja abierta"**

El mundo visual toma la lógica de un empaque premium desplegado y la convierte en una superficie interactiva. La interfaz enmarca el producto sin encerrarlo: el cubo ocupa el espacio con escala física, mientras el contenido comercial aparece como información impresa sobre un embalaje preciso y contemporáneo.

El sistema combina rigor geométrico, grandes campos de aire y una única acción cromática. El color pertenece ante todo al cubo. La interfaz se mantiene sobria para que cada sticker, giro y cambio de estado sea legible. El movimiento surge de la manipulación directa, no de ornamentación permanente.

**Key Characteristics:**

- Composición asimétrica con un objeto 3D dominante.
- Superficies frías y limpias, sin nostalgia artesanal.
- Tipografía grotesca geométrica con jerarquía compacta.
- Controles táctiles que se sienten físicos y responden desde el contacto.
- Un solo momento extraordinario: la resolución del cubo.

## Colors

La estrategia es monocromática con un único acento cobalto. Los seis colores del cubo son contenido del producto y no se convierten en decoración de interfaz.

### Primary

- **Cobalto de acción:** reservado para foco, estados activos y la acción principal.

### Neutral

- **Papel frío:** campo principal claro, levemente gris y sin matiz crema.
- **Grafito de molde:** texto y cuerpos estructurales; nunca negro absoluto.
- **Humo técnico:** superficies secundarias y separaciones tonales.
- **Blanco de luz:** reflejos controlados y texto sobre fondos oscuros.

**The Product Owns Color Rule.** El color multicolor se concentra en el cubo. La interfaz no replica sus seis caras en botones, fondos o etiquetas.

**The One Accent Rule.** El cobalto es el único acento de interfaz en toda la superficie.

## Typography

La tipografía usa una familia sans variable de construcción geométrica, con suficiente calidez para contenido comercial y suficiente precisión para estados del juego. La familia final se resolverá durante la implementación con soporte completo para español y portugués.

La jerarquía evita el contraste editorial de serif y sans. Título, cuerpo, controles y estados pertenecen a una sola voz, diferenciados por ancho, peso, tamaño y espaciado.

**The Two-Line Rule.** El título principal ocupa como máximo dos líneas en cualquier ancho.

**The Plain Language Rule.** Las instrucciones usan verbos directos y no dependen de terminología de speedcubing.

## Layout

La composición de escritorio utiliza una cuadrícula asimétrica: información comercial en el tercio izquierdo y escenario 3D expandido hacia el centro y el borde derecho. El cubo puede cruzar divisiones internas del empaque, pero nunca invade el área de lectura ni tapa acciones.

En móvil, la estructura se vuelve una sola columna. El encabezado permanece compacto, el cubo ocupa aproximadamente la mitad de la altura dinámica visible y los controles se agrupan bajo la escena. La acción de compra puede fijarse al borde inferior respetando el área segura, siempre que no tape el juego.

El contenido completo cabe en el primer viewport en condiciones normales. La página puede crecer cuando el texto del usuario aumenta, el dispositivo es muy bajo o la ayuda está abierta; nunca se recorta contenido para simular un hero perfecto.

**The First Viewport Rule.** Producto, promesa, desafío y compra son visibles sin desplazamiento en un portátil estándar y en un teléfono contemporáneo.

## Elevation & Depth

La profundidad procede del objeto 3D, de una sombra de contacto estable y de diferencias tonales amplias. Las superficies HTML permanecen mayormente planas. Los botones se separan mediante contraste, borde interior y respuesta al contacto, no mediante sombras flotantes genéricas.

El cubo utiliza iluminación de estudio suave: luz principal grande, relleno frío y reflejo controlado sobre plástico y stickers satinados. No se usa bloom ni profundidad de campo como requisito.

**The Grounded Object Rule.** El cubo siempre conserva una referencia de suelo o contacto. Nunca flota dentro de un vacío digital.

## Shapes

El lenguaje combina el volumen suavemente biselado del producto con superficies de interfaz precisas. Los controles principales son cápsulas compactas; los controles de icono son círculos equivalentes; los paneles y diálogos usan esquinas moderadas. Esta diferencia es funcional y se mantiene de forma consistente.

Los cubitos tienen biseles pequeños y separación real entre piezas. Los stickers son cuadrados redondeados con radios inferiores al cuerpo.

## Do's and Don'ts

### Do:

- **Do** mantener el cubo como el elemento visual más grande.
- **Do** mostrar feedback desde `pointerdown`.
- **Do** conservar copy, controles y CTA como HTML semántico fuera del canvas.
- **Do** adaptar sombras, DPR y postprocesado al dispositivo.
- **Do** ofrecer equivalentes estáticos y accesibles para movimiento reducido o WebGL ausente.

### Don't:

- **Don't** usar gradientes morados, brillos neón o fondos de malla genéricos.
- **Don't** encerrar el cubo dentro de una tarjeta.
- **Don't** convertir cada color de sticker en un color de interfaz.
- **Don't** añadir precio, stock, garantía, reseñas o prestaciones físicas inventadas.
- **Don't** depender de hover, notación experta o texto dentro del canvas.
- **Don't** usar la marca Rubik ni logotipos de terceros.

## Selected Composition

La composición final combina las opciones A y B del estudio visual, según la elección del usuario. De A conserva el cubo apoyado sobre planos de troquel desplegados, la jerarquía comercial izquierda y la gran escala del producto. De B adopta la franja cobalto, el rigor instrumental y una columna técnica derecha. La columna no publica peso, materiales, magnetismo ni prestaciones no confirmadas: muestra telemetría real del cubo jugable.

La tipografía de implementación será **Archivo Black** para el título de producto y **Archivo** para cuerpo, controles y microcopy. Comparten construcción industrial, admiten español y portugués y permiten distinguir voz de empaque y voz funcional sin introducir una serif editorial genérica.

La dirección surgió del concept seed `fed89b21`, candidato 6: empaque modular de juguete con troquel. Este dato identifica el origen de la forma y no se muestra como contenido de la página.

## Live Instrumentation

La columna técnica funciona como un instrumento conectado al objeto, no como una lista de ventajas comerciales. Muestra:

- Una matriz de 26 puntos; las piezas de la capa activa se encienden.
- Un diagrama de 9 capas; la capa seleccionada se desplaza o resalta.
- Un indicador de 90 grados que adopta la dirección del giro.
- Un contador de movimientos con transición numérica.
- El último giro con nombre natural localizado.
- El estado actual: listo, desordenando, en juego o resuelto.
- El progreso de mezcla sobre 20 movimientos.

La instrumentación conserva actividad visual mínima y significativa. El punto de estado respira cuando está listo, los ticks direccionales avanzan durante un giro y la matriz reacciona solo a las piezas afectadas. Las animaciones se pausan cuando la pestaña queda oculta. Con movimiento reducido, los mismos cambios se expresan mediante estados estáticos de color, texto y contraste.

En móvil, la columna se convierte en una banda horizontal de tres datos prioritarios. El resto queda disponible en un control expandible sin desplazar el cubo fuera del primer viewport.
