import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", backgroundColor: "#ffe6e6", border: "1px solid red", borderRadius: "8px", margin: "20px" }}>
          <h2>Упс, что-то пошло не так.</h2>
          <p>Приложение столкнулось с критической ошибкой:</p>
          <pre>{this.state.error?.message}</pre>
          <p>Откройте консоль (F12) для получения детальной информации.</p>
        </div>
      );
    }

    return this.props.children;
  }
}