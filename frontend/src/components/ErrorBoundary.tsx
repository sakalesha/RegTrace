import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("App render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              The app hit an unexpected error. If this is a fresh deploy, confirm the
              backend <code>VITE_API_URL</code> and API environment variables are set,
              then reload.
            </p>
            <pre className="text-left text-xs text-muted-foreground bg-muted rounded p-3 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
