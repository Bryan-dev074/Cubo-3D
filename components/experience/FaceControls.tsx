"use client";

import { ArrowClockwise, ArrowCounterClockwise, CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";

import {
  LAYER_NOTATION,
  createLayerMove,
  type LayerId,
} from "@/lib/cube/notation";
import type { CubeMove } from "@/lib/cube/types";
import type { Dictionary } from "@/lib/i18n/types";

export interface FaceControlsProps {
  readonly dictionary: Dictionary;
  readonly onMove: (move: CubeMove) => void;
  readonly isAnimating?: boolean;
}

export function FaceControls({
  dictionary,
  onMove,
  isAnimating = false,
}: FaceControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const controlsId = useId();
  const layerLabels: Record<LayerId, string> = {
    right: dictionary.faceRight,
    left: dictionary.faceLeft,
    up: dictionary.faceUp,
    down: dictionary.faceDown,
    front: dictionary.faceFront,
    back: dictionary.faceBack,
    middle: dictionary.faceMiddle,
    equator: dictionary.faceEquator,
    standing: dictionary.faceStanding,
  };

  return (
    <section className="face-controls">
      <button
        type="button"
        className="face-controls__toggle"
        aria-label={
          isExpanded ? dictionary.controlsHide : dictionary.controlsShow
        }
        aria-controls={controlsId}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span className="face-controls__label-full">
          {isExpanded ? dictionary.controlsHide : dictionary.controlsShow}
        </span>
        <span aria-hidden="true" className="face-controls__label-compact">
          {dictionary.telemetryLayers}
        </span>
        <CaretDown aria-hidden="true" size={18} weight="bold" />
      </button>

      {isExpanded ? (
        <div
          id={controlsId}
          className="face-controls__grid"
          role="group"
          aria-label={dictionary.controlsGroup}
        >
          {LAYER_NOTATION.flatMap((layer) => {
            const clockwiseLabel = `${layerLabels[layer.id]} ${dictionary.directionClockwise}`;
            const counterclockwiseLabel = `${layerLabels[layer.id]} ${dictionary.directionCounterclockwise}`;

            return [
              <button
                key={`${layer.id}-clockwise`}
                type="button"
                className="face-controls__move"
                disabled={isAnimating}
                onClick={() => onMove(createLayerMove(layer, "clockwise"))}
              >
                <ArrowClockwise aria-hidden="true" size={18} />
                <span>{clockwiseLabel}</span>
                <small aria-hidden="true">{layer.notation}</small>
              </button>,
              <button
                key={`${layer.id}-counterclockwise`}
                type="button"
                className="face-controls__move"
                disabled={isAnimating}
                onClick={() => onMove(createLayerMove(layer, "counterclockwise"))}
              >
                <ArrowCounterClockwise aria-hidden="true" size={18} />
                <span>{counterclockwiseLabel}</span>
                <small aria-hidden="true">{layer.notation}&prime;</small>
              </button>,
            ];
          })}
        </div>
      ) : null}
    </section>
  );
}
