# Task 4: composición del plan, telemetría y dock compacto

## Estado

Completo. La portada ahora integra un plano desplegado de empaque como fondo
editorial, una columna de telemetría diagramática y un dock compacto de tres
acciones. Se preservan el cubo 3D real, la cola de movimientos, gestos,
localización ES/PT, celebración, fallback y render WebGL bajo demanda.

## Evidencia TDD

### RED

Comando:

`npm test -- tests/components/live-telemetry.test.tsx`

Resultado esperado: fallo porque todavía no existían
`[data-testid="layer-diagram"]`, el dial técnico ni el medidor de mezcla
semántico.

Después se agregaron los contratos de composición y dock en
`tests/components/experience.test.tsx`; el pase focal siguió rojo mientras el
plano permanecía dentro del stage y el dock todavía mostraba cinco controles.

### GREEN focal

Comando:

`npm test -- tests/components/live-telemetry.test.tsx tests/components/experience.test.tsx`

Resultado: 2 archivos, 35/35.

Los contratos cubren:

- plano localizado, decorativo y hermano del hero/stage;
- exactamente tres acciones primarias: Desordenar, Reiniciar y Ayuda;
- utilidades secundarias mediante overlay con estado `aria-expanded`;
- diagrama real de nueve planos, dial de giro y progreso fiel al snapshot.

## Implementación final

### Plano de empaque

- `MagicCubeExperience.tsx:359` dibuja cuatro paneles, pestañas redondeadas,
  cortes sólidos, pliegues punteados, marca CUBO 3D, cubo lineal, matriz de 42
  puntos y registros.
- Vive en el workspace y detrás del hero/stage, no dentro del lienzo WebGL.
- El contorno superior izquierdo se retiró y la pestaña lateral se bajó para
  mantener limpio el bloque de título y promesa.
- ES usa `Desafiá tu mente.` y PT `Desafie sua mente.`.

### Telemetría diagramática

- `LiveTelemetry.tsx:208` reemplaza la grilla abstracta por un cubo isométrico
  3×3 con nueve planos de datos verdaderos.
- `LiveTelemetry.tsx:133` muestra el giro como dial técnico de 90 grados.
- `LiveTelemetry.tsx:191` expone el progreso real con `aria-valuemin`,
  `aria-valuemax` y `aria-valuenow`.
- La columna ocupa la altura editorial disponible y mantiene separación
  geométrica en 1440 y 1600.

### Dock compacto

- `ControlDock.tsx:36` mantiene solo Desordenar, Reiniciar y Ayuda en el dock
  principal de aproximadamente `266×78 px`.
- Deshacer y los giros por capa viven en un overlay secundario.
- El disparador conserva `aria-controls`, `aria-expanded`, cierre por Escape
  con devolución de foco y cierre por puntero externo.
- En móvil el botón secundario permanece visible y el dock entra en el flujo.
- Se corrigió un defecto descubierto por E2E: el grid expandido de giros
  cubría Deshacer. Ahora abre por encima de toda la bandeja en desktop; en
  móvil conserva su layout estático.

## Revisión de movimiento

| Antes | Después | Por qué |
|---|---|---|
| 26 celdas con delays independientes | Un solo barrido de grupo de 4.8 s | Mantiene una señal instrumental tenue sin 26 loops coordinados (`experience.module.css:578`, `experience.module.css:1008`). |
| Capas sin transición diagramática útil | Opacidad de 180 ms con `ease-out` | Comunica el plano activo sin animar layout (`experience.module.css:623`). |
| Dirección representada por un marcador mínimo | Aguja del dial, 220 ms con `ease-out` | Hace legible el giro real de 90 grados (`experience.module.css:665`). |
| Contador remontado por `key` con `number-enter` de 180 ms y traslación | Actualización numérica estática, sin keyframes ni remount | Los movimientos pueden iniciarse con teclado y son una acción frecuente; deben responder sin movimiento (`LiveTelemetry.tsx:152`, `experience.module.css:703`). |
| Utilidades solo reveladas por hover/foco en desktop | Aparición de 140 ms para puntero fino y visibilidad permanente con touch/coarse | Reduce ruido con mouse sin esconder la acción a dispositivos táctiles anchos (`experience.module.css:766`, `experience.module.css:1101`). |

Pausas verificadas:

- la telemetría usa `data-motion-paused` ante interacción, pestaña oculta y
  preferencia reducida;
- hover/focus dentro del dock pausa el único barrido;
- `prefers-reduced-motion` limita animaciones a una iteración de 1 ms y vuelve
  instantáneas las transiciones de plano/dial;
- el contador de movimientos se actualiza de forma completamente estática;
- no se introdujo `transition: all`, animación de layout, autorrotación ni
  loop WebGL.

Veredicto de movimiento: **SHIP (Approve)**. No queda animación en acciones
frecuentes o iniciadas por teclado. El único loop nuevo pertenece a un
instrumento de estado, afecta un solo pseudo-elemento, permanece tenue y tiene
todos los mecanismos de pausa requeridos.

## Capturas finales inspeccionadas

- `D:\CODE\Cubo3D\.superpowers\sdd\task-4-desktop-1600.png`
  - Plano visible aproximadamente entre `x=228..1292`.
  - Telemetría entre `y=116..904`, igual al alto editorial de referencia.
  - Hero limpio, cubo completo y dock `266×80 px` con tres acciones.
  - La curva restante comienza en `x=744.5` y el registro superior fue movido
    a `x=600.9`; ninguno toca la promesa o el hint.
- `D:\CODE\Cubo3D\.superpowers\sdd\task-4-desktop-1440.png`
  - Sin colisión entre H1, cubo, plano, dock y telemetría.
  - Matriz y marca técnica conservan lectura secundaria.
- `D:\CODE\Cubo3D\.superpowers\sdd\task-4-mobile-390.png`
  - H1, promesa, CTA, hint y cubo completo dentro del primer viewport.
  - Plano atenuado, botón de utilidades táctil y dock en flujo.
- `D:\CODE\Cubo3D\.superpowers\sdd\task-4-mobile-320.png`
  - Encabezado sin cruces, cubo completo y acciones de 44 px o más.
  - Cero overflow horizontal.

El runner visual inicial pasó 4/4. La recaptura focal 1600 posterior pasó 1/1
con aserciones geométricas de `x>=600` y copy libre. Ambos runners temporales
fueron retirados antes del commit.

## Verificación E2E

Durante el pase focal aparecieron expectativas antiguas: los tests buscaban
los giros antes de abrir el nuevo overlay o después de un cambio de idioma que
lo cerraba. Las ayudas se actualizaron para aceptar overlay abierto/cerrado y
reabrirlo en el idioma vigente.

También se detectó el solapamiento real entre el grid de giros y Deshacer,
descrito arriba. Evidencia posterior:

- caso scramble/undo focal: 1/1;
- seis casos afectados: 6/6;
- matriz inicial, ejecutada una vez ya verde: 21/21.

La matriz final incluye:

- cero draw calls WebGL durante idle después de una órbita real;
- mouse, teclado y touch;
- mezcla, giro, deshacer, reinicio y celebración;
- fallback WebGL y localización;
- geometría responsive en 1600×1000, 1440×900, 390×844 y 320×700;
- consola, requests, HTTP, hidratación y errores de página limpios.

### Corrección posterior a revisión

RED:

- componentes + contrato de fuente: 2 fallos esperados y 31 pases; faltaban
  el contrato de geometría copy-clear y la eliminación de
  `key={snapshot.confirmedUserMoves}` / `number-enter`;
- coarse-touch 1024×768: el tap agotó 5 s porque el workspace interceptaba el
  botón con `opacity: 0` y `pointer-events: none`;
- recaptura geométrica: el registro quedó inicialmente en `x=599.84`, 0.16 px
  antes del límite explícito.

GREEN:

- componentes + contrato de fuente: 2 archivos, 33/33;
- contrato de fuente de animación aislado: 9/9;
- coarse-touch real 1024×768: 1/1; abre con tap, confirma
  `aria-expanded`, muestra Deshacer/FaceControls y cierra con tap;
- plan 1600: 1/1 con registro en `x=600.9`, curva en `x=744.5` y copy libre;
- matriz final posterior, ejecutada una sola vez: 22/22.

## Gates finales

- Suite unitaria focal original: 2 archivos, 35/35.
- Focal posterior de componentes + contratos: 2 archivos, 33/33.
- Contrato de fuente de animación: 9/9.
- Suite unitaria completa: 25 archivos, 219/219.
- E2E coarse-touch 1024×768: 1/1.
- E2E experiencia + responsive: 22/22.
- WebGL idle: PASS dentro de E2E.
- Build de producción: PASS dentro del arranque E2E.
- Lint: PASS.
- TypeScript: PASS.
- `git diff --check`: PASS.

No se ejecutó el detector final de Impeccable, por instrucción explícita.

## Autorrevisión y preocupaciones

- La bandeja completa de 18 giros es deliberadamente densa en desktop; queda
  fuera de la composición base y solo aparece por petición explícita.
- El plano móvil está atenuado para no competir con interacción y texto.
- El barrido de matriz es decorativo-instrumental y no representa progreso;
  los valores, capas, dirección y mezcla sí provienen del snapshot real.
- No quedan bloqueos conocidos.
