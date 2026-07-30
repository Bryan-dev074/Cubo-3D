# Alineación visual y rendimiento con la referencia aprobada

**Fecha:** 2026-07-30  
**Estado:** Aprobado por el usuario mediante la imagen de referencia  
**Referencia visual:** `codex-clipboard-96db7636-16bc-4249-bc76-a92616bd021a.png`

## Objetivo

Transformar la experiencia existente en la composición editorial blanca y cobalto de la referencia, manteniendo intacto el juego real, la compra por WhatsApp y la localización ES/PT. El cubo debe permanecer inmóvil cuando nadie interactúa con él y renderizar únicamente cuando una acción, un giro de capa o una celebración lo requieran.

## Dirección visual

- Superficie principal blanco cálido, sin alternancia automática a un tema oscuro.
- Columna editorial cobalto más ancha, con nombre vertical, descriptor breve y diagrama técnico.
- Cabecera blanca alta con “CUBO 3D”, selector ES/PT y CTA de compra.
- Título de gran escala y alineado hacia la parte superior izquierda del workspace.
- Cubo más pequeño, desplazado a la derecha, completamente visible y apoyado visualmente sobre un plano de empaque.
- Plano troquelado amplio que cruza la zona hero y la zona del cubo, con pliegues, pestañas, rótulos y matriz de puntos.
- Telemetría lateral diagramática y respirada: piezas, capas, giro, movimientos, último giro, estado y mezcla.
- Dock de acciones compacto y flotante en el centro inferior.

## Movimiento

- No existe autorrotación ni oscilación periódica del cubo.
- En reposo, dos capturas del canvas separadas al menos 650 ms deben ser idénticas.
- El render de Three.js continúa siendo bajo demanda.
- Solo se animan giros reales, gestos, celebración y transiciones de estado justificadas.
- La telemetría puede conservar un único pulso discreto y lento, sin animar individualmente las 26 piezas.
- `prefers-reduced-motion` desactiva los movimientos decorativos.

## Cubo y escena

- Cámara más distante y encuadre específico para móvil para que el cubo nunca quede recortado.
- Plástico grafito satinado y stickers de acabado mate/satinado.
- Iluminación de estudio suave, sin brillos quemados ni sombras duras.
- Sombra de contacto amplia y sutil para anclar el cubo.
- La pose inicial muestra correctamente tres caras resueltas; después de mezclar, los colores responden al estado real.

## Responsive

- En escritorio de 1600×1000 la jerarquía y las proporciones deben acercarse a la referencia: spine ~150 px, cabecera ~96 px, título ~80–96 px, cubo contenido en la mitad derecha y telemetría de ~240 px.
- En 1440×900 no puede existir colisión entre título, cubo, telemetría o dock.
- Por debajo de 900 px el layout se convierte en una columna clara: cabecera, hero, cubo completo, acciones y telemetría.
- En 390×844 y 320×700 no debe haber overflow horizontal; el CTA principal y la interacción del cubo deben aparecer dentro de un recorrido cómodo.

## Contenido y comercio

- Se mantienen español y portugués con contenido equivalente.
- El CTA “Comprar cubo” / “Comprar cubo” y el CTA posterior a resolver apuntan al WhatsApp configurado.
- El mensaje de WhatsApp continúa localizado y listo para enviar.
- El título visible de marca en cabecera es “CUBO 3D”; el H1 conserva “Cubo Mágico 3D” / “Cubo Mágico 3D”.

## Criterios de aceptación

1. El canvas no cambia en reposo y no produce llamadas de dibujo continuas.
2. El fondo permanece claro aunque el sistema operativo prefiera modo oscuro.
3. El resultado en 1600×1000 coincide materialmente con la jerarquía, proporciones y lenguaje visual de la referencia.
4. El cubo completo es visible y manipulable con mouse, teclado y tacto.
5. Mezclar, girar capas, reiniciar, ayuda, cambiar idioma, resolver y comprar siguen funcionando.
6. Lint, TypeScript, pruebas unitarias, build de producción y pruebas E2E pasan sin errores.
