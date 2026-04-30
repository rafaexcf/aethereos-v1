import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    // App crash isolated — user can reset via the error UI
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.error !== null) {
      return (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
          style={{ background: "var(--bg-base)" }}
        >
          <p
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Algo deu errado neste app
          </p>
          <p
            className="text-[12px] text-center max-w-sm font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--glass-bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--glass-bg)")
            }
          >
            Fechar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
