import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

/** Drop into Nova Plus Wallet src/components/ErrorBoundary.tsx — wrap <App /> in main.tsx */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Nova Plus ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-[#1a0a0a] text-[#f5e6c8]">
            <h1 className="text-xl font-semibold text-[#c9a227]">Wallet paused</h1>
            <p className="text-sm opacity-80 max-w-md text-center">
              Something went wrong. Your keys are still safe — reload or lock the wallet.
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded bg-[#6b1d1d] text-[#f5e6c8]"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
