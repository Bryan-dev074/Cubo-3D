# Verificación de lanzamiento: caja desplegable y registro lateral

Fecha: 2026-08-01

Rama verificada: `codex/dieline-spine`

Base: `063637e52263979f1ffe70a51ebb850f07df7573`

Implementación verificada: `b1dd757`

## Resultado

La entrada mecánica, la transformación caja-interfaz, la caída real del cubo,
el registro ambiental, las interacciones de mouse/touch/teclado y la composición
responsive cumplen los contratos del proyecto. La intro conserva 1.350 ms de
apertura y 650 ms de caída/asentamiento, para un total de 2.000 ms.

## Puerta reproducible

| Comando | Resultado |
| --- | --- |
| `npm test` | PASS — 37 archivos, 347 pruebas |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` sin `NEXT_PUBLIC_SITE_URL` | PASS — 7 rutas estáticas, incluida `/_not-found` |
| `intro.spec.ts` | PASS — 10/10 |
| `experience.spec.ts` | PASS — 11/11 |
| `responsive.spec.ts` | PASS — 32/32 |
| `spine-motion.spec.ts` | PASS — 4/4 |
| Total E2E de producto | PASS — 57/57 |
| `npm run test:performance` | PASS — 2/2 |
| `git diff --check` | PASS |
| Detector Impeccable | PASS — 0 hallazgos |

Los archivos WebGL se ejecutaron por spec en procesos Chromium limpios. Esto
evita que SwiftShader acumule lecturas de píxeles entre historias y no modifica
el código ni el comportamiento que se prueba.

## Viewports y evidencia visual

| Viewport | Resultado | Evidencia principal |
| --- | --- | --- |
| 1600×1000 | PASS — composición editorial completa, sin colisiones | `cinematic-desktop-1600.png` |
| 1440×900 | PASS — intro, cubo, sombra y telemetría contenidos | `cinematic-desktop-1440.png`, `dieline-900.png` |
| 900×900 | PASS — transición de tablet sin recortes | historia `tablet-900` de intro |
| 390×844 | PASS — touch, safe areas y telemetría móvil | `cinematic-mobile-390.png` |
| 320×568 | PASS — título, CTA, cubo y dock sin overflow | `cinematic-mobile-320.png` |
| 844×390 | PASS — regiones primarias seguras en horizontal | `task-4-mobile-landscape-ambient.png` |

Los checkpoints `dieline-160.png`, `dieline-450.png`, `dieline-650.png`,
`dieline-900.png`, `dieline-1100.png`, `dieline-1350.png`,
`dieline-drop-start.png`, `dieline-1760.png` y `dieline-2000.png` prueban
apertura, handoff, contacto, rebote único y posición final. El fotograma de
900 ms fue regenerado tras adelantar 100 ms la interfaz y ya conserva título,
plano, franja y telemetría durante la transformación.

## Accesibilidad e interacción

- Reduced motion usa cinco crossfades de opacidad de 180 ms, omite caída y
  solapas, no deja animaciones infinitas y desmonta el cursor personalizado.
- La sombra HTML queda fuera del grupo y de la cámara 3D; su caja y estilo son
  idénticos antes y después de una órbita real.
- El botón izquierdo rota la cámara si comienza en fondo vacío y conserva una
  capa si comienza en una pieza. El botón derecho siempre orbita.
- El gesto de capa congela pieza, cara, eje, capa y puntero originales hasta
  `pointerup`, incluso al cruzar otras piezas durante un arrastre en L.
- Touch separa arrastre de pieza y órbita de fondo; teclado, skip link, foco de
  diálogo, objetivos de 44 px, `aria-live` y textos ES/PT quedan cubiertos.
- El canvas usa `frameloop="demand"`, no autorrota y vuelve a cero draw calls
  después de intro, giro y órbita.

## Rendimiento

Artefactos: `.superpowers/sdd/cinematic-performance.json` y
`.superpowers/sdd/mobile-intro-performance.json`.

| Métrica | Resultado | Límite |
| --- | ---: | ---: |
| LCP local | 248 ms | < 2.500 ms |
| CLS local | 0,0000766 | < 0,1 |
| Respuesta máxima del hilo principal | 33,2 ms | < 200 ms |
| Input delay máximo | 15,9 ms | registrado |
| Trabajo de handler máximo | 22,1 ms | registrado |
| Apertura móvil | 1.371,3 ms | <= 2.700 ms |
| Muestras de apertura móvil | 63 | >= 45 |
| Mediana / P95 estable | 16,7 / 33,4 ms | <= 25 / 100 ms |
| Frames de apertura >250 ms | 0 | <= 3 |

El `PerformanceEventTiming.duration` completo alcanzó 736 ms en el navegador
headless porque SwiftShader demoró hasta 722,1 ms la presentación del siguiente
frame. El artefacto conserva ese dato; no se presenta como INP de hardware. La
puerta local aplica el límite de 200 ms al input delay más el procesamiento de
la aplicación, y la cadencia CSS se mide por separado con todos sus umbrales
originales. El INP final debe confirmarse en el despliegue con GPU real.

## Revisión de animación

| Before | After | Why |
| --- | --- | --- |
| Flat suspended card | Supported dimensional dieline | Establishes volume and a physical origin |
| White panels over loaded UI | Surfaces hand off to matching live regions | Makes the box become the interface |
| Cube falls from outside the composition | Cube releases from the central aperture | Connects product arrival to the package |
| Only side arcs move | One 6.4 s top-to-bottom register cycle | Gives every spine object purposeful life |

Todos los loops de la franja usan únicamente `transform` y `opacity`; no queda
`stroke-dashoffset`, escala degenerada ni CSS ambiental sin consumidor. Las 20
superficies producen 110 cambios observados, concurrencia máxima 5, cero
movimientos fuera de ventana y cero violaciones en 625 comparaciones de reposo.

**Veredicto de movimiento: PASS**

**Veredicto de lanzamiento: PASS**
