"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { SceneFallback } from "@/components/cube/SceneFallback";
import type { Locale } from "@/lib/i18n/types";

interface SceneErrorBoundaryProps {
  readonly children: ReactNode;
  readonly locale?: Locale;
  readonly onSceneError?: (reason: "error") => void;
  readonly onRetry?: () => void;
  readonly purchaseHref: string;
}

interface SceneErrorBoundaryState {
  readonly error: Error | null;
  readonly retryKey: number;
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = {
    error: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<SceneErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Cube scene failed", error, errorInfo);
    this.props.onSceneError?.("error");
  }

  private retry = () => {
    this.props.onRetry?.();
    this.setState(({ retryKey }) => ({
      error: null,
      retryKey: retryKey + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <SceneFallback
          locale={this.props.locale}
          onRetry={this.retry}
          purchaseHref={this.props.purchaseHref}
          reason="error"
        />
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
