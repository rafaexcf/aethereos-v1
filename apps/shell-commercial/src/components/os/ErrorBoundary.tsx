import { Component, type ReactNode, type ErrorInfo } from "react";
import { reportError } from "../../lib/observability";

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

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Sprint 31 MX171: roteia via observability — Sentry se disponível,
    // console.error estruturado caso contrário.
    const ctx: { tag: string; componentStack?: string } = {
      tag: "AppErrorBoundary",
    };
    if (typeof info.componentStack === "string") {
      ctx.componentStack = info.componentStack;
    }
    reportError(error, ctx);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    // Recarrega o app re-mountando — preserva o shell, outros apps continuam.
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.error !== null) {
      return (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
          style={{ background: "var(--bg-base)" }}
        >
          <div
            className="flex flex-col items-center gap-4 p-6 max-w-sm w-full"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-md), var(--glass-specular)",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-lg)",
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.2)",
              }}
            >
              <span style={{ fontSize: 22 }}>⚠</span>
            </div>

            <div className="text-center">
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Algo deu errado neste app
              </p>
              <p
                className="mt-1.5 font-mono text-center"
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                }}
              >
                {this.state.error.message}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={this.handleReload}
                className="px-5 py-2 transition-all"
                style={{
                  background: "rgba(99,102,241,0.85)",
                  border: "1px solid rgba(99,102,241,1)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#6366f1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.85)";
                }}
              >
                Recarregar
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2 transition-all"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--glass-bg)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
