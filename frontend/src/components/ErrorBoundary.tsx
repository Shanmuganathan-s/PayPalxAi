import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("PayPulse UI boundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 border border-[#E2E0D8] bg-[#FCFBF9] p-8 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">
              The analytics canvas hit a snag.
            </p>
            <p className="max-w-md text-xs text-[#64748B]">{this.state.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
