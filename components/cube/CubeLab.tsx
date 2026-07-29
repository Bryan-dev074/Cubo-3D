"use client";

import { useMemo, useReducer, useState } from "react";

import { CubeCanvas } from "@/components/cube/CubeCanvas";
import type { CubeReviewMode } from "@/components/cube/CubeScene";
import { FaceControls } from "@/components/experience/FaceControls";
import { generateScramble } from "@/lib/cube/scramble";
import type { CubeMove } from "@/lib/cube/types";
import { createInitialGameState, gameReducer } from "@/lib/game/reducer";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const REVIEW_MODES: readonly {
  readonly id: CubeReviewMode;
  readonly label: string;
}[] = [
  { id: "neutral", label: "Luz neutral" },
  { id: "grazing", label: "Luz rasante" },
  { id: "opposite", label: "Órbita opuesta" },
];

export function CubeLab() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [reviewMode, setReviewMode] = useState<CubeReviewMode>("neutral");
  const purchaseHref = useMemo(() => buildWhatsAppUrl("es"), []);
  const isAnimating = state.queue.length > 0;

  const queueMove = (move: CubeMove) => {
    if (!isAnimating) {
      dispatch({ type: "queue-move", move });
    }
  };

  const startScramble = () => {
    if (!isAnimating) {
      dispatch({
        type: "start-scramble",
        moves: generateScramble({ length: 20, seed: 0xc0b03d }),
      });
    }
  };

  return (
    <main className="cube-lab">
      <header className="cube-lab__header">
        <div>
          <p className="eyebrow">Laboratorio visual temporal</p>
          <h1>Cubo procedural</h1>
          <p>
            Arrastrá una pieza para girar su capa. Arrastrá el fondo para inspeccionar la
            construcción.
          </p>
        </div>
        <a href={purchaseHref} rel="noreferrer" target="_blank">
          Comprar por WhatsApp
        </a>
      </header>

      <section aria-label="Escena de revisión del cubo" className="cube-lab__stage">
        <CubeCanvas
          cube={state.cube}
          onMoveComplete={() => dispatch({ type: "confirm-move" })}
          onMoveRequest={queueMove}
          purchaseHref={purchaseHref}
          queue={state.queue}
          reviewMode={reviewMode}
        />
      </section>

      <div className="cube-lab__toolbar">
        <section aria-label="Acciones de prueba" className="cube-lab__actions">
          <button type="button" disabled={isAnimating} onClick={startScramble}>
            Mezclar 20 movimientos
          </button>
          <button
            type="button"
            disabled={isAnimating}
            onClick={() => dispatch({ type: "reset" })}
          >
            Reiniciar
          </button>
          <span aria-live="polite">
            {isAnimating
              ? `${state.queue.length} movimientos en cola`
              : `${state.confirmedUserMoves} movimientos confirmados`}
          </span>
        </section>

        <section aria-label="Vistas de revisión" className="cube-lab__review-modes">
          {REVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={reviewMode === mode.id}
              onClick={() => setReviewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </section>
      </div>

      <FaceControls
        dictionary={dictionaries.es}
        isAnimating={isAnimating}
        onMove={queueMove}
      />
    </main>
  );
}
