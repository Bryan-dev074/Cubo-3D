"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { SceneFallback } from "@/components/cube/SceneFallback";

interface SceneErrorBoundaryProps {
  readonly children: ReactNode;
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
          onRetry={this.retry}
          purchaseHref={this.props.purchaseHref}
          reason="error"
        />
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
